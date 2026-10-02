const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Developer = require("../models/Developer");
const Project = require("../models/Project");
const Activity = require("../models/Activity");
const Overlap = require("../models/Overlap");
const { determineSeverity } = require("../overlap/severityStrategies");
const { shouldAlert } = require("../overlap/alertCooldown");

const ACTIVE_WINDOW_MS = 60_000;
const STALE_SWEEP_INTERVAL_MS = 30_000;
const JWT_SECRET = process.env.JWT_SECRET;

function getRoomRoster(io, projectCode) {
  const room = io.sockets.adapter.rooms.get(projectCode);
  if (!room) return [];

  const roster = [];

  for (const socketId of room) {
    const s = io.sockets.sockets.get(socketId);

    if (s && s.data && s.data.name) {
      roster.push({ name: s.data.name });
    }
  }

  return roster;
}

function registerSocketHandlers(io) {
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;

      if (!token) {
        return next(new Error("Authentication required."));
      }

      const decoded = jwt.verify(token, JWT_SECRET);

      socket.data.userId = decoded.userId;

      next();
    } catch (err) {
      next(new Error("Invalid or expired token."));
    }
  });

  io.on("connection", async (socket) => {
    //console.log(`[socket] client connected: ${socket.id}`);

    try {
      const user = await User.findById(socket.data.userId);

      if (!user) {
        socket.disconnect();
        return;
      }

      socket.data.name = user.name;

      // --- Join a project's room --
      socket.on("join-project", async ({ projectCode }) => {
        if (!projectCode) {
          socket.emit("join-error", {
            error: "projectCode is required.",
          });
          return;
        }

        const normalizedCode = projectCode.toUpperCase();

        const project = await Project.findOne({
          projectCode: normalizedCode,
        });

        if (!project) {
          socket.emit("join-error", {
            error: `No project found with code ${projectCode}.`,
          });
          return;
        }

        socket.join(normalizedCode);

        socket.data.projectCode = normalizedCode;

        await Developer.findOneAndUpdate(
          {
            userId: socket.data.userId,
            projectCode: normalizedCode,
          },
          {
            userId: socket.data.userId,
            projectCode: normalizedCode,
            socketId: socket.id,
            lastSeen: new Date(),
          },
          {
            upsert: true,
          },
        );

        // console.log(
        //   `[socket] ${socket.data.name} joined room ${normalizedCode}`,
        // );

        // io.to(normalizedCode).emit('roster-update', {
        //   projectCode: normalizedCode,
        //   roster: getRoomRoster(io, normalizedCode),
        // });

        const roster = getRoomRoster(io, normalizedCode);

        io.to(normalizedCode).emit("roster-update", {
          projectCode: normalizedCode,
          roster,
        });

        socket.emit("roster-update", {
          projectCode: normalizedCode,
          roster,
        });
      });

      // --- Live edit activity from the extension ---
      socket.on("activity", async (payload) => {
        //console.log("[socket:activity RECEIVED]", payload);

        const { projectCode, file, lineRange, editedLine } = payload;

        const functionName = payload.function;
        const user = socket.data.name;

        if (!projectCode || !user || !file || !functionName) return;

        try {
          await Activity.findOneAndUpdate(
            {
              projectCode,
              developer: user,
            },
            {
              projectCode,
              developer: user,
              file,
              functionName,
              lineRange,
              editedLine,
              timestamp: new Date(),
              status: "active",
            },
            {
              upsert: true,
            },
          );

          const others = await Activity.find({
            projectCode,
            file,
            developer: { $ne: user },
            status: "active",
            timestamp: {
              $gte: new Date(Date.now() - ACTIVE_WINDOW_MS),
            },
          });

          // console.log("[overlap] current developer:", user);
          // console.log("[overlap] searching for:", {
          //   projectCode,
          //   file,
          //   functionName,
          //   editedLine,
          // });

          // console.log(
          //   "[overlap] active others:",
          //   others.map((other) => ({
          //     developer: other.developer,
          //     file: other.file,
          //     functionName: other.functionName,
          //     editedLine: other.editedLine,
          //     timestamp: other.timestamp,
          //     status: other.status,
          //   })),
          // );

          for (const other of others) {
            //console.log("[overlap] comparing with:", other.developer);
            const severity = determineSeverity(
              
              {
                functionName,
                lineRange,
                editedLine,
              },
              {
                functionName: other.functionName,
                lineRange: other.lineRange,
                editedLine: other.editedLine,
              },
            );
            //console.log("[overlap] severity:", severity)
            // if (
            //   !shouldAlert(
            //     projectCode,
            //     user,
            //     other.developer,
            //     file,
            //     functionName,
            //   )
            // ) {
            //   continue;
            // }

            const alertAllowed = shouldAlert(
              projectCode,
              user,
              other.developer,
              file,
              functionName,
            );

            //console.log("[overlap] shouldAlert:", alertAllowed);

            if (!alertAllowed) {
              continue;
            }

            const overlap = await Overlap.create({
              projectCode,
              developersInvolved: [user, other.developer],
              file,
              functionName,
              severity,
            });

            io.to(projectCode).emit("overlap-alert", {
              file,
              functionName,
              severity,
              editedLine,
              developersInvolved: overlap.developersInvolved,
              timestamp: overlap.timestamp,
            });
          }
        } catch (err) {
          console.error("[socket:activity]", err.message);
        }
      });

      // --- Disconnect ----
      socket.on("disconnect", async () => {
        //console.log(`[socket] client disconnected: ${socket.id}`);

        const { projectCode, name } = socket.data || {};

        if (projectCode && name) {
          try {
            await Activity.findOneAndUpdate(
              {
                projectCode,
                developer: name,
              },
              {
                status: "idle",
              },
            );
          } catch (err) {
            console.error("[socket:disconnect]", err.message);
          }

          io.to(projectCode).emit("roster-update", {
            projectCode,
            roster: getRoomRoster(io, projectCode),
          });
        }
      });
    } catch (err) {
      console.error("[socket:auth]", err.message);
      socket.disconnect();
    }
  });

  setInterval(async () => {
    try {
      await Activity.updateMany(
        {
          status: "active",
          timestamp: {
            $lt: new Date(Date.now() - ACTIVE_WINDOW_MS),
          },
        },
        {
          status: "idle",
        },
      );
    } catch (err) {
      console.error("[stale-sweep]", err.message);
    }
  }, STALE_SWEEP_INTERVAL_MS);
}

module.exports = { registerSocketHandlers };
