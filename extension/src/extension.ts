// import * as vscode from 'vscode';
// import { io } from 'socket.io-client';
// import { ActivityTracker } from './tracker/activityTracker';
// import { connectionState } from './state';

// let tracker: ActivityTracker | undefined;

// function getBackendUrl(): string {
//   return vscode.workspace
//     .getConfiguration('conflictradar')
//     .get('backendUrl', 'https://conflictradar-backend.onrender.com');
// }

// async function getToken(context: vscode.ExtensionContext): Promise<string | undefined> {
//   let token = await context.secrets.get('conflictradar.token');

//   if (!token) {
//     token = await vscode.window.showInputBox({
//       prompt: 'ConflictRadar JWT token',
//       placeHolder: 'Paste the token from Postman',
//       password: true,
//       ignoreFocusOut: true,
//     });

//     if (!token) return undefined;

//     await context.secrets.store('conflictradar.token', token);
//   }

//   return token;
// }

// export function activate(context: vscode.ExtensionContext) {
//   const output = vscode.window.createOutputChannel('ConflictRadar');
//   context.subscriptions.push(output);

//   output.appendLine('ConflictRadar extension activated.');

//   tracker = new ActivityTracker(output);
//   context.subscriptions.push({
//     dispose: () => tracker?.dispose(),
//   });

//   const helloCommand = vscode.commands.registerCommand(
//     'conflictradar.hello',
//     () => {
//       vscode.window.showInformationMessage(
//         'ConflictRadar is alive.'
//       );
//     }
//   );

//   const loginCommand = vscode.commands.registerCommand(
//     'conflictradar.login',
//     async () => {
//       const token = await vscode.window.showInputBox({
//         prompt: 'Paste your ConflictRadar JWT token from Postman',
//         placeHolder: 'eyJ...',
//         password: true,
//         ignoreFocusOut: true,
//       });

//       if (!token) return;

//       await context.secrets.store(
//         'conflictradar.token',
//         token.trim()
//       );

//       vscode.window.showInformationMessage(
//         'ConflictRadar token saved.'
//       );

//       output.appendLine(
//         'JWT token saved to VS Code SecretStorage.'
//       );
//     }
//   );

//   const logoutCommand = vscode.commands.registerCommand(
//     'conflictradar.logout',
//     async () => {
//       connectionState.socket?.disconnect();

//       connectionState.socket = undefined;
//       connectionState.projectCode = undefined;
//       connectionState.name = undefined;

//       await context.secrets.delete(
//         'conflictradar.token'
//       );

//       await context.globalState.update(
//         'conflictradar.projectCode',
//         undefined
//       );

//       vscode.window.showInformationMessage(
//         'ConflictRadar logged out.'
//       );

//       output.appendLine(
//         'ConflictRadar token and project state cleared.'
//       );
//     }
//   );

//   const newProjectCommand = vscode.commands.registerCommand(
//     'conflictradar.newProject',
//     async () => {
//       const token = await getToken(context);

//       if (!token) {
//         vscode.window.showErrorMessage(
//           'ConflictRadar: JWT token is required.'
//         );
//         return;
//       }

//       try {
//         const res = await fetch(
//           `${getBackendUrl()}/project/create`,
//           {
//             method: 'POST',
//             headers: {
//               'Content-Type': 'application/json',
//               Authorization: `Bearer ${token}`,
//             },
//             body: JSON.stringify({}),
//           }
//         );

//         const data = (await res.json()) as {
//           projectCode?: string;
//           error?: string;
//         };

//         if (!res.ok || !data.projectCode) {
//           throw new Error(
//             data.error ||
//               `Server returned ${res.status}`
//           );
//         }

//         const projectCode = data.projectCode;

//         output.appendLine(
//           `Created project ${projectCode}.`
//         );

//         vscode.window.showInformationMessage(
//           `Project created: ${projectCode}`
//         );

//         await context.globalState.update(
//           'conflictradar.projectCode',
//           projectCode
//         );

//         connectSocket(
//           projectCode,
//           token,
//           output
//         );
//       } catch (err: any) {
//         vscode.window.showErrorMessage(
//           `Couldn't create project: ${err.message}`
//         );
//       }
//     }
//   );

//   const joinProjectCommand = vscode.commands.registerCommand(
//     'conflictradar.joinProject',
//     async () => {
//       const token = await getToken(context);

//       if (!token) {
//         vscode.window.showErrorMessage(
//           'ConflictRadar: JWT token is required.'
//         );
//         return;
//       }

//       const projectCode =
//         await vscode.window.showInputBox({
//           prompt: 'Project Code',
//           placeHolder: 'e.g. CR-7K2X',
//         });

//       if (!projectCode) return;

//       const normalizedCode =
//         projectCode.trim().toUpperCase();

//       try {
//         const res = await fetch(
//           `${getBackendUrl()}/project/join`,
//           {
//             method: 'POST',
//             headers: {
//               'Content-Type': 'application/json',
//               Authorization: `Bearer ${token}`,
//             },
//             body: JSON.stringify({
//               projectCode: normalizedCode,
//             }),
//           }
//         );

//         const data = (await res.json()) as {
//           ok?: boolean;
//           error?: string;
//         };

//         if (!res.ok || !data.ok) {
//           throw new Error(
//             data.error ||
//               `Server returned ${res.status}`
//           );
//         }

//         output.appendLine(
//           `Joined project ${normalizedCode}.`
//         );

//         vscode.window.showInformationMessage(
//           `Joined ${normalizedCode}.`
//         );

//         await context.globalState.update(
//           'conflictradar.projectCode',
//           normalizedCode
//         );

//         connectSocket(
//           normalizedCode,
//           token,
//           output
//         );
//       } catch (err: any) {
//         vscode.window.showErrorMessage(
//           `Couldn't join ${normalizedCode}: ${err.message}`
//         );
//       }
//     }
//   );

//   context.subscriptions.push(
//     helloCommand,
//     loginCommand,
//     logoutCommand,
//     newProjectCommand,
//     joinProjectCommand
//   );

//   // Automatically reconnect only when we have both
//   // a saved project and a saved JWT.
//   const savedCode =
//     context.globalState.get<string>(
//       'conflictradar.projectCode'
//     );

//   if (savedCode) {
//     getToken(context).then((token) => {
//       if (!token) return;

//       connectSocket(
//         savedCode,
//         token,
//         output
//       );
//     });
//   }
// }

// function connectSocket(
//   projectCode: string,
//   token: string,
//   output: vscode.OutputChannel
// ) {
//   connectionState.socket?.disconnect();

//   const socket = io(getBackendUrl(), {
//     auth: {
//       token,
//     },
//   });

//   connectionState.socket = socket;
//   connectionState.projectCode = projectCode;

//   socket.on('connect', () => {
//     output.appendLine(
//       `Connected to backend socket (${socket.id}).`
//     );

//     output.appendLine(
//       `Joining room ${projectCode}...`
//     );

//     socket.emit('join-project', {
//       projectCode,
//     });
//   });

//   socket.on(
//     'roster-update',
//     (payload: { roster: { name: string }[] }) => {
//       const names = payload.roster
//         .map((d) => d.name)
//         .join(', ');

//       output.appendLine(
//         `Room ${projectCode} now has: ${names}`
//       );
//     }
//   );

//   socket.on(
//     'overlap-alert',
//     (payload: {
//       file: string;
//       functionName: string;
//       severity: string;
//       developersInvolved: string[];
//     }) => {
//       const others =
//         payload.developersInvolved.filter(
//           (n) =>
//             n !== connectionState.name
//         );

//       const who =
//         others.length > 0
//           ? others.join(', ')
//           : 'a teammate';

//       const message =
//         payload.severity === 'same-line'
//           ? `${who} is editing the exact same lines in ${payload.functionName}() — ${payload.file}`
//           : payload.severity === 'same-function'
//           ? `${who} is also editing ${payload.functionName}() in ${payload.file}`
//           : `${who} is also working in ${payload.file}`;

//       output.appendLine(
//         `OVERLAP (${payload.severity}): ${message}`
//       );

//       vscode.window.showWarningMessage(
//         `ConflictRadar: ${message}`
//       );
//     }
//   );

//   socket.on(
//     'join-error',
//     (payload: { error: string }) => {
//       output.appendLine(
//         `Join error: ${payload.error}`
//       );

//       vscode.window.showErrorMessage(
//         `ConflictRadar: ${payload.error}`
//       );
//     }
//   );

//   socket.on(
//     'connect_error',
//     (err) => {
//       output.appendLine(
//         `Socket authentication/connection error: ${err.message}`
//       );

//       vscode.window.showErrorMessage(
//         `ConflictRadar socket: ${err.message}`
//       );
//     }
//   );

//   socket.on('disconnect', () => {
//     output.appendLine(
//       'Disconnected from backend socket.'
//     );
//   });
// }

// export function deactivate() {
//   connectionState.socket?.disconnect();
//   tracker?.dispose();
// }

import * as vscode from "vscode";
import axios from "axios";
import { io } from "socket.io-client";
import { ActivityTracker } from "./tracker/activityTracker";
import { connectionState } from "./state";

let tracker: ActivityTracker | undefined;

function getBackendUrl(): string {
  return vscode.workspace
    .getConfiguration("conflictradar")
    .get("backendUrl", "https://conflictradar-backend.onrender.com");
}

async function getToken(
  context: vscode.ExtensionContext,
): Promise<string | undefined> {
  return await context.secrets.get("conflictradar.token");
}

export function activate(context: vscode.ExtensionContext) {
  const output = vscode.window.createOutputChannel("ConflictRadar");

  context.subscriptions.push(output);

  output.appendLine("ConflictRadar extension activated.");

  tracker = new ActivityTracker(output);

  context.subscriptions.push({
    dispose: () => tracker?.dispose(),
  });

  // --------------------------------------------------
  // HELLO
  // --------------------------------------------------

  const helloCommand = vscode.commands.registerCommand(
    "conflictradar.hello",
    () => {
      vscode.window.showInformationMessage("ConflictRadar is alive.");
    },
  );

  // --------------------------------------------------
  // SIGN UP
  // --------------------------------------------------

  const signupCommand = vscode.commands.registerCommand(
    "conflictradar.signup",
    async () => {
      const name = await vscode.window.showInputBox({
        prompt: "Enter your name",
        placeHolder: "e.g. Vaibhav Singh",
        ignoreFocusOut: true,
        validateInput: (value) => {
          if (!value.trim()) {
            return "Name is required.";
          }

          return undefined;
        },
      });

      if (!name) return;

      const email = await vscode.window.showInputBox({
        prompt: "Enter your email",
        placeHolder: "you@example.com",
        ignoreFocusOut: true,
        validateInput: (value) => {
          if (!value.trim()) {
            return "Email is required.";
          }

          return undefined;
        },
      });

      if (!email) return;

      const password = await vscode.window.showInputBox({
        prompt: "Create a password",
        placeHolder: "Minimum 6 characters",
        password: true,
        ignoreFocusOut: true,
        validateInput: (value) => {
          if (value.length < 6) {
            return "Password must be at least 6 characters.";
          }

          return undefined;
        },
      });

      if (!password) return;

      const confirmPassword = await vscode.window.showInputBox({
        prompt: "Confirm your password",
        password: true,
        ignoreFocusOut: true,
      });

      if (!confirmPassword) return;

      if (password !== confirmPassword) {
        vscode.window.showErrorMessage("Passwords do not match.");
        return;
      }

      try {
        const response = await axios.post(`${getBackendUrl()}/auth/signup`, {
          name: name.trim(),
          email: email.trim(),
          password,
        });

        const data = response.data as {
          ok?: boolean;
          error?: string;
          user?: {
            id: string;
            name: string;
            email: string;
          };
        };

        if (!data.ok) {
          throw new Error(data.error || "Signup failed.");
        }

        vscode.window.showInformationMessage(
          "Account created successfully. Please login.",
        );

        output.appendLine(`Account created for ${email.trim().toLowerCase()}.`);

        await vscode.commands.executeCommand("conflictradar.login");
      } catch (err: any) {
        vscode.window.showErrorMessage(`Signup failed: ${err.message}`);

        output.appendLine(`Signup error: ${err.message}`);
      }
    },
  );

  // --------------------------------------------------
  // LOGIN
  // --------------------------------------------------

  const loginCommand = vscode.commands.registerCommand(
    "conflictradar.login",
    async () => {
      const email = await vscode.window.showInputBox({
        prompt: "Enter your ConflictRadar email",
        placeHolder: "you@example.com",
        ignoreFocusOut: true,
        validateInput: (value) => {
          if (!value.trim()) {
            return "Email is required.";
          }

          return undefined;
        },
      });

      if (!email) return;

      const password = await vscode.window.showInputBox({
        prompt: "Enter your ConflictRadar password",
        password: true,
        ignoreFocusOut: true,
        validateInput: (value) => {
          if (!value) {
            return "Password is required.";
          }

          return undefined;
        },
      });

      if (!password) return;

      try {
        const response = await axios.post(`${getBackendUrl()}/auth/login`, {
          email: email.trim(),
          password,
        });

        const data = response.data as {
          ok?: boolean;
          token?: string;
          error?: string;
          user?: {
            id: string;
            name: string;
            email: string;
          };
        };

        if (!data.ok || !data.token) {
          throw new Error(data.error || "Login failed.");
        }

        await context.secrets.store("conflictradar.token", data.token);

        vscode.window.showInformationMessage(
          `Welcome, ${data.user?.name || "User"}!`,
        );

        output.appendLine(`Logged in as ${data.user?.email || email}.`);
      } catch (err: any) {
        const message =
          err.response?.data?.error || err.message || "Login failed.";

        vscode.window.showErrorMessage(`Login failed: ${message}`);

        output.appendLine(`Login error: ${message}`);
      }

      // try {
      //   const res = await fetch(
      //     `${getBackendUrl()}/auth/login`,
      //     {
      //       method: 'POST',
      //       headers: {
      //         'Content-Type': 'application/json',
      //       },
      //       body: JSON.stringify({
      //         email: email.trim(),
      //         password,
      //       }),
      //     }
      //   );

      //   const data = (await res.json()) as {
      //     ok?: boolean;
      //     token?: string;
      //     error?: string;
      //     user?: {
      //       id: string;
      //       name: string;
      //       email: string;
      //     };
      //   };

      //   if (!res.ok || !data.ok || !data.token) {
      //     throw new Error(
      //       data.error ||
      //         'Login failed.'
      //     );
      //   }

      //   await context.secrets.store(
      //     'conflictradar.token',
      //     data.token
      //   );

      //   vscode.window.showInformationMessage(
      //     `Welcome, ${data.user?.name || 'User'}!`
      //   );

      //   output.appendLine(
      //     `Logged in as ${data.user?.email || email}.`
      //   );

      // } catch (err: any) {
      //   vscode.window.showErrorMessage(
      //     `Login failed: ${err.message}`
      //   );

      //   output.appendLine(
      //     `Login error: ${err.message}`
      //   );
      // }
    },
  );

  // --------------------------------------------------
  // LOGOUT
  // --------------------------------------------------

  const logoutCommand = vscode.commands.registerCommand(
    "conflictradar.logout",
    async () => {
      connectionState.socket?.disconnect();

      connectionState.socket = undefined;
      connectionState.projectCode = undefined;
      connectionState.name = undefined;

      await context.secrets.delete("conflictradar.token");

      await context.globalState.update("conflictradar.projectCode", undefined);

      vscode.window.showInformationMessage("ConflictRadar logged out.");

      output.appendLine("ConflictRadar token and project state cleared.");
    },
  );

  // --------------------------------------------------
  // CREATE PROJECT
  // --------------------------------------------------

  const newProjectCommand = vscode.commands.registerCommand(
    "conflictradar.newProject",
    async () => {
      const token = await getToken(context);

      if (!token) {
        vscode.window.showErrorMessage("Please login to ConflictRadar first.");

        await vscode.commands.executeCommand("conflictradar.login");

        return;
      }

      // Optional GitHub repository URL
      const githubRepoUrl = await vscode.window.showInputBox({
        prompt: "GitHub Repository URL (optional)",
        placeHolder:
          "https://github.com/username/repository — press Enter to skip",
        ignoreFocusOut: true,
      });

      // Esc = cancel entire project creation
      if (githubRepoUrl === undefined) {
        return;
      }

      const trimmedGithubUrl = githubRepoUrl.trim();

      try {
        const res = await fetch(`${getBackendUrl()}/project/create`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            githubRepoUrl: trimmedGithubUrl || undefined,
          }),
        });

        const data = (await res.json()) as {
          projectCode?: string;
          error?: string;
        };

        if (!res.ok || !data.projectCode) {
          throw new Error(data.error || `Server returned ${res.status}`);
        }

        const projectCode = data.projectCode;

        output.appendLine(`Created project ${projectCode}.`);

        if (trimmedGithubUrl) {
          output.appendLine(`GitHub repository: ${trimmedGithubUrl}`);
        } else {
          output.appendLine("GitHub repository: skipped.");
        }

        vscode.window.showInformationMessage(`Project created: ${projectCode}`);

        await context.globalState.update(
          "conflictradar.projectCode",
          projectCode,
        );

        connectSocket(projectCode, token, output);
      } catch (err: any) {
        vscode.window.showErrorMessage(
          `Couldn't create project: ${err.message}`,
        );
      }
    },
  );

  // --------------------------------------------------
  // JOIN PROJECT
  // --------------------------------------------------

  const joinProjectCommand = vscode.commands.registerCommand(
    "conflictradar.joinProject",
    async () => {
      const token = await getToken(context);

      if (!token) {
        vscode.window.showErrorMessage("Please login to ConflictRadar first.");

        await vscode.commands.executeCommand("conflictradar.login");

        return;
      }

      const projectCode = await vscode.window.showInputBox({
        prompt: "Enter Project Code",
        placeHolder: "e.g. CR-7K2X",
        ignoreFocusOut: true,
        validateInput: (value) => {
          if (!value.trim()) {
            return "Project code is required.";
          }

          return undefined;
        },
      });

      if (!projectCode) return;

      const normalizedCode = projectCode.trim().toUpperCase();

      try {
        const res = await fetch(`${getBackendUrl()}/project/join`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            projectCode: normalizedCode,
          }),
        });

        const data = (await res.json()) as {
          ok?: boolean;
          error?: string;
        };

        if (!res.ok || !data.ok) {
          throw new Error(data.error || `Server returned ${res.status}`);
        }

        output.appendLine(`Joined project ${normalizedCode}.`);

        vscode.window.showInformationMessage(`Joined ${normalizedCode}.`);

        await context.globalState.update(
          "conflictradar.projectCode",
          normalizedCode,
        );

        connectSocket(normalizedCode, token, output);
      } catch (err: any) {
        vscode.window.showErrorMessage(
          `Couldn't join ${normalizedCode}: ${err.message}`,
        );
      }
    },
  );

  // --------------------------------------------------
  // REGISTER COMMANDS
  // --------------------------------------------------

  context.subscriptions.push(
    helloCommand,
    signupCommand,
    loginCommand,
    logoutCommand,
    newProjectCommand,
    joinProjectCommand,
  );

  // --------------------------------------------------
  // AUTO RECONNECT
  // --------------------------------------------------

  const savedCode = context.globalState.get<string>(
    "conflictradar.projectCode",
  );

  if (savedCode) {
    getToken(context).then((token) => {
      if (!token) return;

      connectSocket(savedCode, token, output);
    });
  }
}

// --------------------------------------------------
// SOCKET CONNECTION
// --------------------------------------------------

function connectSocket(
  projectCode: string,
  token: string,
  output: vscode.OutputChannel,
) {
  connectionState.socket?.disconnect();

  const socket = io(getBackendUrl(), {
    auth: {
      token,
    },
  });

  connectionState.socket = socket;
  connectionState.projectCode = projectCode;

  socket.on("connect", () => {
    output.appendLine(`Connected to backend socket (${socket.id}).`);

    output.appendLine(`Joining room ${projectCode}...`);

    socket.emit("join-project", {
      projectCode,
    });
  });

  socket.on("roster-update", (payload: { roster: { name: string }[] }) => {
    const names = payload.roster.map((d) => d.name).join(", ");

    output.appendLine(`Room ${projectCode} now has: ${names}`);
  });

  socket.on(
    "overlap-alert",
    (payload: {
      file: string;
      functionName: string;
      severity: string;
      developersInvolved: string[];
    }) => {
      const others = payload.developersInvolved.filter(
        (n) => n !== connectionState.name,
      );

      const who = others.length > 0 ? others.join(", ") : "a teammate";

      const message =
        payload.severity === "same-line"
          ? `${who} is editing the exact same lines in ${payload.functionName}() — ${payload.file}`
          : payload.severity === "same-function"
            ? `${who} is also editing ${payload.functionName}() in ${payload.file}`
            : `${who} is also working in ${payload.file}`;

      output.appendLine(`OVERLAP (${payload.severity}): ${message}`);

      vscode.window.showWarningMessage(`ConflictRadar: ${message}`);
    },
  );

  socket.on("join-error", (payload: { error: string }) => {
    output.appendLine(`Join error: ${payload.error}`);

    vscode.window.showErrorMessage(`ConflictRadar: ${payload.error}`);
  });

  socket.on("connect_error", (err) => {
    output.appendLine(`Socket authentication/connection error: ${err.message}`);

    vscode.window.showErrorMessage(`ConflictRadar socket: ${err.message}`);
  });

  socket.on("disconnect", () => {
    output.appendLine("Disconnected from backend socket.");
  });
}

export function deactivate() {
  connectionState.socket?.disconnect();
  tracker?.dispose();
}
