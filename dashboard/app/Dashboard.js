
"use client";

import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { useRouter } from "next/navigation";
import LogoutButton from "./components/LogoutButton";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000";

const HEATMAP_POLL_MS = 10_000;

export default function Dashboard() {
  const router = useRouter();

  const [joined, setJoined] = useState(false);
  const [projectCode, setProjectCode] = useState("");
  const [roster, setRoster] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [heatmap, setHeatmap] = useState([]);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [connected, setConnected] = useState(false);

  // Profile
  const [showProfile, setShowProfile] = useState(false);
  const [user, setUser] = useState(null);

  const socketRef = useRef(null);

  /*
   * Check authentication and restore project
   */
  useEffect(() => {
    const token = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");

    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        setUser(null);
      }
    }

    if (!token) {
      router.replace("/login");
      return;
    }

    const savedProjectCode = localStorage.getItem("projectCode");

    if (!savedProjectCode) {
      router.replace("/project");
      return;
    }

    setProjectCode(savedProjectCode);
    setJoined(true);
    setCheckingAuth(false);
  }, [router]);

  /*
   * Connect to Socket.io automatically
   */
  useEffect(() => {
    if (!joined || !projectCode) return;

    const token = localStorage.getItem("token");

    if (!token) {
      router.replace("/login");
      return;
    }

    const socket = io(BACKEND_URL, {
      auth: {
        token,
      },
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      setConnected(true);

      socket.emit("join-project", {
        projectCode,
      });
    });

    socket.on("roster-update", (payload) => {
      setRoster(payload.roster || []);
    });

    socket.on("overlap-alert", (payload) => {
      const alert = {
        ...payload,
        id: `${Date.now()}-${Math.random()}`,
      };

      setAlerts((prev) => [alert, ...prev].slice(0, 50));
    });

    socket.on("join-error", (payload) => {
      console.error("[dashboard] join error:", payload.error);
    });

    socket.on("connect_error", (err) => {
      console.error(
        "[dashboard] socket connection error:",
        err.message
      );

      setConnected(false);

      if (
        err.message === "Authentication required" ||
        err.message === "Invalid or expired token"
      ) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        localStorage.removeItem("projectCode");

        router.replace("/login");
      }
    });

    socket.on("disconnect", () => {
      setConnected(false);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setConnected(false);
    };
  }, [joined, projectCode, router]);

  /*
   * Heatmap polling
   */
  useEffect(() => {
    if (!joined || !projectCode) return;

    let cancelled = false;

    async function loadHeatmap() {
      try {
        const res = await fetch(
          `${BACKEND_URL}/project/${projectCode}/heatmap`
        );

        const data = await res.json();

        if (!cancelled && res.ok) {
          setHeatmap(data.heatmap || []);
        }
      } catch {
        // Heatmap failure should not affect live roster or alerts.
      }
    }

    loadHeatmap();

    const interval = setInterval(
      loadHeatmap,
      HEATMAP_POLL_MS
    );

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [joined, projectCode]);

  /*
   * Create / join another project
   */
  function handleNewProject() {
    socketRef.current?.disconnect();

    localStorage.removeItem("projectCode");

    router.push("/project");
  }

  /*
   * Format alert time
   */
  function formatTime(timestamp) {
    if (!timestamp) return "";

    return new Date(timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  }

  /*
   * Alert severity label
   */
  function getSeverityLabel(severity) {
    if (severity === "same-line") return "Same Line";
    if (severity === "same-function") return "Same Function";
    if (severity === "same-file") return "Same File";

    return severity || "Overlap";
  }

  /*
   * Alert severity CSS class
   */
  function getSeverityClass(severity) {
    if (severity === "same-line") return "severity-critical";
    if (severity === "same-function") return "severity-warning";

    return "severity-info";
  }

  /*
   * Profile helpers
   */
  const displayName =
    user?.name ||
    user?.username ||
    "Developer";

  const displayEmail =
    user?.email ||
    "Email not available";

  const profileInitial =
    displayName.charAt(0).toUpperCase();

  /*
   * Close profile when Escape is pressed
   */
  useEffect(() => {
    if (!showProfile) return;

    function handleEscape(event) {
      if (event.key === "Escape") {
        setShowProfile(false);
      }
    }

    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener(
        "keydown",
        handleEscape
      );
    };
  }, [showProfile]);

  const maxHeatmapCount =
    heatmap.length > 0
      ? Math.max(
          ...heatmap.map((item) => item.count),
          1
        )
      : 1;

  /*
   * Authentication/project check
   */
  if (checkingAuth) {
    return (
      <main className="dashboardLoading">
        <div className="loadingSpinner" />
        <p>Loading ConflictRadar...</p>
      </main>
    );
  }

  return (
    <main className="dashboardShell">

      {/* Top Navigation */}
      <header className="topbar">

        <div className="brandSection">
          <div className="brandIcon">
            CR
          </div>

          <div>
            <div className="brandName">
              ConflictRadar
            </div>

            <div className="brandSubtitle">
              Developer collaboration monitor
            </div>
          </div>
        </div>

        <div className="topbarRight">

          <div className="projectBadge">
            <span className="projectDot" />
            {projectCode}
          </div>

          <div className="connectionBadge">
            <span
              className={`connectionDot ${
                connected
                  ? "connected"
                  : "disconnected"
              }`}
            />

            {connected
              ? "Connected"
              : "Disconnected"}
          </div>

          <button
            type="button"
            className="newProjectButton"
            onClick={handleNewProject}
          >
            + New Project
          </button>

          {/* Profile Button */}
          <button
            type="button"
            className="profileButton"
            onClick={() =>
              setShowProfile(true)
            }
            aria-label="Open profile"
          >
            <span className="profileInitial">
              {profileInitial}
            </span>
          </button>

          <LogoutButton />

        </div>
      </header>

      <div className="dashboardContent">

        {/* Hero */}
        <section className="dashboardHero">

          <div>
            <div className="eyebrow">
              PROJECT OVERVIEW
            </div>

            <h1>
              Team activity
            </h1>

            <p>
              Monitor developer activity and detect
              overlapping code changes in real time.
            </p>
          </div>

          <div className="liveIndicator">
            <span />
            Live monitoring
          </div>

        </section>

        {/* Stats */}
        <section className="statsGrid">

          <div className="statCard">
            <div className="statIcon developersIcon">
              DEV
            </div>

            <div>
              <span className="statLabel">
                Developers Online
              </span>

              <strong className="statValue">
                {roster.length}
              </strong>
            </div>
          </div>

          <div className="statCard">
            <div className="statIcon alertIcon">
              !
            </div>

            <div>
              <span className="statLabel">
                Live Alerts
              </span>

              <strong className="statValue">
                {alerts.length}
              </strong>
            </div>
          </div>

          <div className="statCard">
            <div className="statIcon heatIcon">
              #
            </div>

            <div>
              <span className="statLabel">
                Contested Areas
              </span>

              <strong className="statValue">
                {heatmap.length}
              </strong>
            </div>
          </div>

        </section>

        {/* Main Grid */}
        <section className="mainGrid">

          {/* Developers */}
          <div className="panel">

            <div className="panelHeader">

              <div>
                <h2>
                  Active Developers
                </h2>

                <p>
                  Developers currently connected
                  to this project.
                </p>
              </div>

              <span className="countBadge">
                {roster.length}
              </span>

            </div>

            {roster.length === 0 ? (
              <div className="emptyState">

                <div className="emptyIcon">
                  👥
                </div>

                <strong>
                  No developers online
                </strong>

                <span>
                  Waiting for teammates to connect.
                </span>

              </div>
            ) : (
              <div className="developerList">

                {roster.map(
                  (developer, index) => (
                    <div
                      key={`${developer.name}-${index}`}
                      className="developerRow"
                    >

                      <div className="avatar">
                        {developer.name
                          ?.charAt(0)
                          ?.toUpperCase() || "?"}
                      </div>

                      <div className="developerInfo">

                        <strong>
                          {developer.name}
                        </strong>

                        <span>
                          Active in project
                        </span>

                      </div>

                      <div className="onlineStatus">
                        <span />
                        Online
                      </div>

                    </div>
                  )
                )}

              </div>
            )}

          </div>

          {/* Alerts */}
          <div className="panel">

            <div className="panelHeader">

              <div>
                <h2>
                  Overlap Alerts
                </h2>

                <p>
                  Real-time conflicts detected
                  by ConflictRadar.
                </p>
              </div>

              <span className="countBadge alertCount">
                {alerts.length}
              </span>

            </div>

            {alerts.length === 0 ? (
              <div className="emptyState">

                <div className="emptyIcon successIcon">
                  ✓
                </div>

                <strong>
                  No overlaps detected
                </strong>

                <span>
                  Your team is currently working
                  without detected conflicts.
                </span>

              </div>
            ) : (
              <div className="alertList">

                {alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`alertCard ${getSeverityClass(
                      alert.severity
                    )}`}
                  >

                    <div className="alertTop">

                      <span
                        className={`severityBadge ${getSeverityClass(
                          alert.severity
                        )}`}
                      >
                        {getSeverityLabel(
                          alert.severity
                        )}
                      </span>

                      <span className="alertTime">
                        {formatTime(
                          alert.timestamp
                        )}
                      </span>

                    </div>

                    <div className="alertFile">
                      {alert.file}
                    </div>

                    <div className="alertFunction">
                      {alert.functionName}()
                    </div>

                    <div className="developerConflict">

                      <span>
                        {alert.developersInvolved?.[0]}
                      </span>

                      <span className="conflictArrow">
                        ↔
                      </span>

                      <span>
                        {alert.developersInvolved?.[1]}
                      </span>

                    </div>

                    {alert.editedLine != null && (
                      <div className="lineInfo">
                        Line {alert.editedLine}
                      </div>
                    )}

                  </div>
                ))}

              </div>
            )}

          </div>

        </section>

        {/* Heatmap */}
        <section className="panel heatmapPanel">

          <div className="panelHeader">

            <div>
              <h2>
                Overlap Heatmap
              </h2>

              <p>
                Functions and files with the highest
                overlap activity.
              </p>
            </div>

            <span className="heatmapLegend">
              {heatmap.length} areas
            </span>

          </div>

          {heatmap.length === 0 ? (
            <div className="emptyState heatEmpty">

              <div className="emptyIcon">
                ◌
              </div>

              <strong>
                No overlap history yet
              </strong>

              <span>
                Conflict activity will appear here
                as developers work together.
              </span>

            </div>
          ) : (
            <div className="heatmapList">

              {heatmap.map((row) => {

                const width =
                  (row.count /
                    maxHeatmapCount) *
                  100;

                return (
                  <div
                    key={`${row.file}:${row.functionName}`}
                    className="heatmapRow"
                  >

                    <div className="heatmapInfo">

                      <span className="fileName">
                        {row.file}
                      </span>

                      <span className="functionName">
                        {row.functionName}()
                      </span>

                    </div>

                    <div className="heatTrack">

                      <div
                        className="heatFill"
                        style={{
                          width: `${Math.max(
                            width,
                            5
                          )}%`,
                        }}
                      />

                    </div>

                    <span className="heatNumber">
                      {row.count}
                    </span>

                  </div>
                );
              })}

            </div>
          )}

        </section>

        {/* Footer */}
        <footer className="dashboardFooter">

          <span>
            ConflictRadar
          </span>

          <span>
            Real-time collaborative development
            monitoring
          </span>

          <span>
            Project {projectCode}
          </span>

        </footer>

      </div>

      {/* =========================================
          PROFILE MODAL
          ========================================= */}
      {showProfile && (
        <div
          className="profileOverlay"
          onClick={() =>
            setShowProfile(false)
          }
        >

          <div
            className="profileModal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            {/* Close button */}
            <button
              type="button"
              className="profileClose"
              onClick={() =>
                setShowProfile(false)
              }
              aria-label="Close profile"
            >
              ×
            </button>

            {/* Avatar */}
            <div className="profileAvatar">
              {profileInitial}
            </div>

            {/* User name */}
            <h2>
              {displayName}
            </h2>

            {/* User email */}
            <p className="profileEmail">
              {displayEmail}
            </p>

            {/* Divider */}
            <div className="profileDivider" />

            {/* Name */}
            <div className="profileInfo">

              <span className="profileInfoLabel">
                Name
              </span>

              <span className="profileInfoValue">
                {displayName}
              </span>

            </div>

            {/* Email */}
            <div className="profileInfo">

              <span className="profileInfoLabel">
                Email
              </span>

              <span className="profileInfoValue">
                {displayEmail}
              </span>

            </div>

            {/* Project */}
            <div className="profileInfo">

              <span className="profileInfoLabel">
                Project
              </span>

              <span className="profileInfoValue">
                {projectCode}
              </span>

            </div>

          </div>

        </div>
      )}

    </main>
  );
}