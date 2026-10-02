import * as vscode from 'vscode';
import { findFunctionBoundaries, mapLineToFunction } from '../ast/functionMapper';
import { connectionState } from '../state';

const DEBOUNCE_MS = 700; //500ms-1s window

export class ActivityTracker {
  private outputChannel: vscode.OutputChannel;
  private debounceTimers = new Map<string, NodeJS.Timeout>();
  private disposable: vscode.Disposable;

  constructor(outputChannel: vscode.OutputChannel) {
    this.outputChannel = outputChannel;
    this.disposable = vscode.workspace.onDidChangeTextDocument((event) =>
      this.onChange(event)
    );
  }

  private onChange(event: vscode.TextDocumentChangeEvent) {
    if (event.contentChanges.length === 0) return;
    if (event.document.uri.scheme !== 'file') return;

    const key = event.document.uri.toString();

    const existing = this.debounceTimers.get(key);
    if (existing) clearTimeout(existing);

    const timer = setTimeout(() => {
      this.debounceTimers.delete(key);
      this.processEdit(event);
    }, DEBOUNCE_MS);

    this.debounceTimers.set(key, timer);
  }

  private processEdit(event: vscode.TextDocumentChangeEvent) {
    const document = event.document;
    const lastChange = event.contentChanges[event.contentChanges.length - 1];
    const zeroBasedLine = lastChange.range.start.line;
    const oneBasedLine = zeroBasedLine + 1;

    let functions;
    try {
      functions = findFunctionBoundaries(document.getText());
    } catch (err) {
      return;
    }

    const match = mapLineToFunction(functions, oneBasedLine);
    const relativePath = vscode.workspace.asRelativePath(document.uri, false);
    const timestamp = new Date().toLocaleTimeString();

    if (match) {
      this.outputChannel.appendLine(
        `[${timestamp}] ${relativePath}:${oneBasedLine} -> inside "${match.name}" (${match.kind}, lines ${match.startLine}-${match.endLine})`
      );
     //this.emitActivity(relativePath, match.name, match.startLine, match.endLine);
     this.emitActivity(
  relativePath,
  match.name,
  match.startLine,
  match.endLine,
  oneBasedLine
);
    } else {
      this.outputChannel.appendLine(
        `[${timestamp}] ${relativePath}:${oneBasedLine} -> not inside a tracked function`
      );
    }
  }

  private emitActivity(file: string, functionName: string, startLine: number, endLine: number, editedLine: number) {
    // const { socket, projectCode, name } = connectionState;
    const { socket, projectCode } = connectionState;
    //if (!socket || !socket.connected || !projectCode || !name) return; // not joined to a project yet
    if (!socket || !socket.connected || !projectCode) return;

    socket.emit('activity', {
      projectCode,
      file,
      function: functionName,
      lineRange: { start: startLine, end: endLine },
      editedLine,
      timestamp: Date.now(),
    });
  }

  dispose() {
    this.disposable.dispose();
    for (const timer of this.debounceTimers.values()) clearTimeout(timer);
  }
}
