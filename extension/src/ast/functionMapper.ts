import * as parser from '@babel/parser';

import traverse from '@babel/traverse';

export interface FunctionBoundary {
  name: string;
  kind: 'function' | 'method' | 'const-function';
  startLine: number;
  endLine: number;
}


export function findFunctionBoundaries(sourceCode: string): FunctionBoundary[] {
  const ast = parser.parse(sourceCode, {
    sourceType: 'module',
    plugins: ['jsx', 'typescript'],
  });

  const functions: FunctionBoundary[] = [];


  traverse(ast, {
    FunctionDeclaration(nodePath: any) {
      const name = nodePath.node.id ? nodePath.node.id.name : null;
      if (!name) return; // skip anonymous — out of scope for the demo
      functions.push({
        name,
        kind: 'function',
        startLine: nodePath.node.loc.start.line,
        endLine: nodePath.node.loc.end.line,
      });
    },
    ClassMethod(nodePath: any) {
      const name = nodePath.node.key && nodePath.node.key.name;
      if (!name) return;
      functions.push({
        name,
        kind: 'method',
        startLine: nodePath.node.loc.start.line,
        endLine: nodePath.node.loc.end.line,
      });
    },
    VariableDeclarator(nodePath: any) {
      const init = nodePath.node.init;
      const isFn =
        init && (init.type === 'ArrowFunctionExpression' || init.type === 'FunctionExpression');
      if (isFn && nodePath.node.id && nodePath.node.id.name) {
        functions.push({
          name: nodePath.node.id.name,
          kind: 'const-function',
          startLine: nodePath.node.loc.start.line,
          endLine: init.loc.end.line,
        });
      }
    },
  });

  return functions;
}


export function mapLineToFunction(
  functions: FunctionBoundary[],
  oneBasedLine: number
): FunctionBoundary | null {
  for (const fn of functions) {
    if (oneBasedLine >= fn.startLine && oneBasedLine <= fn.endLine) {
      return fn;
    }
  }
  return null;
}
