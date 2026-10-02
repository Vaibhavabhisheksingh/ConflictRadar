

import * as vscode from 'vscode';
import { io } from 'socket.io-client';
import { ActivityTracker } from './tracker/activityTracker';
import { connectionState } from './state';

let tracker: ActivityTracker | undefined;

function getBackendUrl(): string {
  return vscode.workspace
    .getConfiguration('conflictradar')
    .get('backendUrl', 'http://localhost:4000');
}

async function getToken(context: vscode.ExtensionContext): Promise<string | undefined> {
  let token = await context.secrets.get('conflictradar.token');

  if (!token) {
    token = await vscode.window.showInputBox({
      prompt: 'ConflictRadar JWT token',
      placeHolder: 'Paste the token from Postman',
      password: true,
      ignoreFocusOut: true,
    });

    if (!token) return undefined;

    await context.secrets.store('conflictradar.token', token);
  }

  return token;
}

export function activate(context: vscode.ExtensionContext) {
  const output = vscode.window.createOutputChannel('ConflictRadar');
  context.subscriptions.push(output);

  output.appendLine('ConflictRadar extension activated.');

  tracker = new ActivityTracker(output);
  context.subscriptions.push({
    dispose: () => tracker?.dispose(),
  });

  const helloCommand = vscode.commands.registerCommand(
    'conflictradar.hello',
    () => {
      vscode.window.showInformationMessage(
        'ConflictRadar is alive.'
      );
    }
  );

  const loginCommand = vscode.commands.registerCommand(
    'conflictradar.login',
    async () => {
      const token = await vscode.window.showInputBox({
        prompt: 'Paste your ConflictRadar JWT token from Postman',
        placeHolder: 'eyJ...',
        password: true,
        ignoreFocusOut: true,
      });

      if (!token) return;

      await context.secrets.store(
        'conflictradar.token',
        token.trim()
      );

      vscode.window.showInformationMessage(
        'ConflictRadar token saved.'
      );

      output.appendLine(
        'JWT token saved to VS Code SecretStorage.'
      );
    }
  );

  const logoutCommand = vscode.commands.registerCommand(
    'conflictradar.logout',
    async () => {
      connectionState.socket?.disconnect();

      connectionState.socket = undefined;
      connectionState.projectCode = undefined;
      connectionState.name = undefined;

      await context.secrets.delete(
        'conflictradar.token'
      );

      await context.globalState.update(
        'conflictradar.projectCode',
        undefined
      );

      vscode.window.showInformationMessage(
        'ConflictRadar logged out.'
      );

      output.appendLine(
        'ConflictRadar token and project state cleared.'
      );
    }
  );

  const newProjectCommand = vscode.commands.registerCommand(
    'conflictradar.newProject',
    async () => {
      const token = await getToken(context);

      if (!token) {
        vscode.window.showErrorMessage(
          'ConflictRadar: JWT token is required.'
        );
        return;
      }

      try {
        const res = await fetch(
          `${getBackendUrl()}/project/create`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({}),
          }
        );

        const data = (await res.json()) as {
          projectCode?: string;
          error?: string;
        };

        if (!res.ok || !data.projectCode) {
          throw new Error(
            data.error ||
              `Server returned ${res.status}`
          );
        }

        const projectCode = data.projectCode;

        output.appendLine(
          `Created project ${projectCode}.`
        );

        vscode.window.showInformationMessage(
          `Project created: ${projectCode}`
        );

        await context.globalState.update(
          'conflictradar.projectCode',
          projectCode
        );

        connectSocket(
          projectCode,
          token,
          output
        );
      } catch (err: any) {
        vscode.window.showErrorMessage(
          `Couldn't create project: ${err.message}`
        );
      }
    }
  );

  const joinProjectCommand = vscode.commands.registerCommand(
    'conflictradar.joinProject',
    async () => {
      const token = await getToken(context);

      if (!token) {
        vscode.window.showErrorMessage(
          'ConflictRadar: JWT token is required.'
        );
        return;
      }

      const projectCode =
        await vscode.window.showInputBox({
          prompt: 'Project Code',
          placeHolder: 'e.g. CR-7K2X',
        });

      if (!projectCode) return;

      const normalizedCode =
        projectCode.trim().toUpperCase();

      try {
        const res = await fetch(
          `${getBackendUrl()}/project/join`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              projectCode: normalizedCode,
            }),
          }
        );

        const data = (await res.json()) as {
          ok?: boolean;
          error?: string;
        };

        if (!res.ok || !data.ok) {
          throw new Error(
            data.error ||
              `Server returned ${res.status}`
          );
        }

        output.appendLine(
          `Joined project ${normalizedCode}.`
        );

        vscode.window.showInformationMessage(
          `Joined ${normalizedCode}.`
        );

        await context.globalState.update(
          'conflictradar.projectCode',
          normalizedCode
        );

        connectSocket(
          normalizedCode,
          token,
          output
        );
      } catch (err: any) {
        vscode.window.showErrorMessage(
          `Couldn't join ${normalizedCode}: ${err.message}`
        );
      }
    }
  );

  context.subscriptions.push(
    helloCommand,
    loginCommand,
    logoutCommand,
    newProjectCommand,
    joinProjectCommand
  );

  // Automatically reconnect only when we have both
  // a saved project and a saved JWT.
  const savedCode =
    context.globalState.get<string>(
      'conflictradar.projectCode'
    );

  if (savedCode) {
    getToken(context).then((token) => {
      if (!token) return;

      connectSocket(
        savedCode,
        token,
        output
      );
    });
  }
}

function connectSocket(
  projectCode: string,
  token: string,
  output: vscode.OutputChannel
) {
  connectionState.socket?.disconnect();

  const socket = io(getBackendUrl(), {
    auth: {
      token,
    },
  });

  connectionState.socket = socket;
  connectionState.projectCode = projectCode;

  socket.on('connect', () => {
    output.appendLine(
      `Connected to backend socket (${socket.id}).`
    );

    output.appendLine(
      `Joining room ${projectCode}...`
    );

    socket.emit('join-project', {
      projectCode,
    });
  });

  socket.on(
    'roster-update',
    (payload: { roster: { name: string }[] }) => {
      const names = payload.roster
        .map((d) => d.name)
        .join(', ');

      output.appendLine(
        `Room ${projectCode} now has: ${names}`
      );
    }
  );

  socket.on(
    'overlap-alert',
    (payload: {
      file: string;
      functionName: string;
      severity: string;
      developersInvolved: string[];
    }) => {
      const others =
        payload.developersInvolved.filter(
          (n) =>
            n !== connectionState.name
        );

      const who =
        others.length > 0
          ? others.join(', ')
          : 'a teammate';

      const message =
        payload.severity === 'same-line'
          ? `${who} is editing the exact same lines in ${payload.functionName}() — ${payload.file}`
          : payload.severity === 'same-function'
          ? `${who} is also editing ${payload.functionName}() in ${payload.file}`
          : `${who} is also working in ${payload.file}`;

      output.appendLine(
        `OVERLAP (${payload.severity}): ${message}`
      );

      vscode.window.showWarningMessage(
        `ConflictRadar: ${message}`
      );
    }
  );

  socket.on(
    'join-error',
    (payload: { error: string }) => {
      output.appendLine(
        `Join error: ${payload.error}`
      );

      vscode.window.showErrorMessage(
        `ConflictRadar: ${payload.error}`
      );
    }
  );

  socket.on(
    'connect_error',
    (err) => {
      output.appendLine(
        `Socket authentication/connection error: ${err.message}`
      );

      vscode.window.showErrorMessage(
        `ConflictRadar socket: ${err.message}`
      );
    }
  );

  socket.on('disconnect', () => {
    output.appendLine(
      'Disconnected from backend socket.'
    );
  });
}

export function deactivate() {
  connectionState.socket?.disconnect();
  tracker?.dispose();
}