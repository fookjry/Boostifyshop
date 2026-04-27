import { Project, SyntaxKind, CallExpression } from 'ts-morph';
import fs from 'fs';

const project = new Project();
project.addSourceFilesAtPaths(['server.ts']);
const sourceFile = project.getSourceFileOrThrow('server.ts');

const callExpressions = sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression);
const replacements: { start: number, end: number, newText: string }[] = [];

callExpressions.forEach(callExpr => {
  const propAccess = callExpr.getExpressionIfKind(SyntaxKind.PropertyAccessExpression);
  if (!propAccess) return;

  const propName = propAccess.getName(); // 'run', 'get', 'all'
  const caller = propAccess.getExpression(); // should be CallExpression dbLocal.prepare(...)

  if (['run', 'get', 'all'].includes(propName)) {
     if (caller.getKind() === SyntaxKind.CallExpression) {
         const callerCall = caller as CallExpression;
         const innerPropAccess = callerCall.getExpressionIfKind(SyntaxKind.PropertyAccessExpression);
         if (innerPropAccess && innerPropAccess.getName() === 'prepare' && innerPropAccess.getExpression().getText() === 'dbLocal') {
             // We found dbLocal.prepare(sql).run(args)
             const sqlArg = callerCall.getArguments()[0].getText();
             const runArgs = callExpr.getArguments().map(a => a.getText());
             
             let newText = `await db.${propName}(${sqlArg}`;
             if (runArgs.length > 0) {
                 newText += `, [${runArgs.join(', ')}]`;
             }
             newText += `)`;
             replacements.push({ start: callExpr.getStart(), end: callExpr.getEnd(), newText });
         }
     }
  } else if (propName === 'exec' && propAccess.getExpression().getText() === 'dbLocal') {
     const args = callExpr.getArguments().map(a => a.getText());
     replacements.push({ start: callExpr.getStart(), end: callExpr.getEnd(), newText: `await db.exec(${args.join(', ')})` });
  } else if (propName === 'transaction' && propAccess.getExpression().getText() === 'dbLocal') {
     const args = callExpr.getArguments();
     if (args.length === 1 && args[0].getKind() === SyntaxKind.ArrowFunction) {
          let arrowFuncBody = args[0].getText();
          if (!arrowFuncBody.startsWith('async')) {
              arrowFuncBody = 'async ' + arrowFuncBody;
          }
          const replacement = `(async (...txArgs) => await db.transaction(async (tRun, tGet, tAll) => { const txFn = ${arrowFuncBody}; return await txFn(...txArgs); }))`;
          replacements.push({ start: callExpr.getStart(), end: callExpr.getEnd(), newText: replacement });
     }
  }
});

// Avoid overlaps and handle properly
let updatedCode = sourceFile.getFullText();

// Fix the await wrapping first using manual replaces because inside functions we need `async`
// Actually, they are inside async functions already in server.ts except one startup check.
// I'll just order replacements by start desc
replacements.sort((a, b) => b.start - a.start);

replacements.forEach(r => {
    updatedCode = updatedCode.substring(0, r.start) + r.newText + updatedCode.substring(r.end);
});

updatedCode = updatedCode.replace(/import Database from 'better-sqlite3';/g, "import { dbRaw as db } from './db-helper';\nimport Database from 'better-sqlite3';");
updatedCode = updatedCode.replace(/let dbLocal:\s*Database\.Database;/g, "");
updatedCode = updatedCode.replace(/dbLocal = new Database\('local_database\.db'\);/g, "");
updatedCode = updatedCode.replace(/dbLocal\s*=\s*new Database\('local_database\.db', \{ readonly: true \}\);/g, "");
updatedCode = updatedCode.replace(/dbLocal\.pragma\('journal_mode = WAL'\);/g, "");
updatedCode = updatedCode.replace(/try\s*\{\s*dbLocal\.close\(\);\s*\}\s*catch\s*\(e\)\s*\{\}/g, "try { db.close(); } catch(e) {}");

fs.writeFileSync('server-refactored2.ts', updatedCode);
