

const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;

function listFunctions(sourceCode) {
  const ast = parser.parse(sourceCode, {
    sourceType: 'module',
    plugins: ['jsx', 'typescript'],
  });

  const functions = [];

 
  traverse(ast, {
    FunctionDeclaration(nodePath) {
      const name = nodePath.node.id ? nodePath.node.id.name : '<anonymous>';
      functions.push({
        name,
        kind: 'function',
        startLine: nodePath.node.loc.start.line,
        endLine: nodePath.node.loc.end.line,
      });
    },
    ClassMethod(nodePath) {
      const name = nodePath.node.key.name || '<computed>';
      functions.push({
        name,
        kind: 'method',
        startLine: nodePath.node.loc.start.line,
        endLine: nodePath.node.loc.end.line,
      });
    },
  
    VariableDeclarator(nodePath) {
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

function main() {
  const target = process.argv[2] || __filename;
  const source = fs.readFileSync(target, 'utf8');
  const functions = listFunctions(source);

  console.log(`\nFunctions found in ${path.basename(target)}:\n`);
  if (functions.length === 0) {
    console.log('  (none found)');
  }
  for (const fn of functions) {
    console.log(`  [${fn.kind}] ${fn.name}  (lines ${fn.startLine}-${fn.endLine})`);
  }
  console.log('');
}

main();

module.exports = { listFunctions };
