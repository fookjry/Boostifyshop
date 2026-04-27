import { Project, SyntaxKind, CallExpression, FunctionDeclaration, ArrowFunction, ExpressionStatement } from 'ts-morph';
import fs from 'fs';

let sourceCode = fs.readFileSync('server.bak.ts', 'utf-8');

const project = new Project();
const sourceFile = project.createSourceFile('server-temp.ts', sourceCode, { overwrite: true });

// 1. Rename dbLocal to pgDb or just remove its declarations since we use dbRaw as pgDb
sourceFile.getStatements().forEach(stmt => {
   if (stmt.getText().includes('let dbLocal: Database.Database;')) stmt.remove();
   else if (stmt.getText().includes("dbLocal = new Database('local_database.db');")) stmt.remove();
   else if (stmt.getText().includes("dbLocal = new Database('local_database.db', { readonly: true });")) stmt.remove();
   else if (stmt.getText().includes("dbLocal.pragma('journal_mode = WAL');")) stmt.remove();
});

// 2. Make syncFirebaseToSqlite async
const syncFunc = sourceFile.getFunction('syncFirebaseToSqlite');
if (syncFunc) {
   syncFunc.setIsAsync(true);
}

// 3. Make all dbLocal calls inside arrow functions and regular functions async
while (true) {
  const callExpr = sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression).find(callExpr => {
      const propAccess = callExpr.getExpressionIfKind(SyntaxKind.PropertyAccessExpression);
      if (!propAccess) return false;
      const propName = propAccess.getName(); 
      const caller = propAccess.getExpression(); 
      if (['run', 'get', 'all'].includes(propName) && caller.getKind() === SyntaxKind.CallExpression) {
         const callerCall = caller as CallExpression;
         const innerPropAccess = callerCall.getExpressionIfKind(SyntaxKind.PropertyAccessExpression);
         if (innerPropAccess && innerPropAccess.getName() === 'prepare' && innerPropAccess.getExpression().getText() === 'dbLocal') {
             return true;
         }
      } else if (propName === 'exec' && propAccess.getExpression().getText() === 'dbLocal') {
         return true;
      } else if (propName === 'transaction' && propAccess.getExpression().getText() === 'dbLocal') {
         return true;
      }
      return false;
  });

  if (!callExpr) break;

  const propAccess = callExpr.getExpressionIfKind(SyntaxKind.PropertyAccessExpression)!;
  const propName = propAccess.getName(); 
  
  if (['run', 'get', 'all'].includes(propName)) {
      const callerCall = propAccess.getExpression() as CallExpression;
      const sqlArg = callerCall.getArguments()[0].getText();
      const runArgs = callExpr.getArguments().map(a => a.getText());
      
      let newText = `await pgDb.${propName}(${sqlArg}`;
      if (runArgs.length > 0) {
          newText += `, [${runArgs.join(', ')}]`;
      }
      newText += `)`;
      callExpr.replaceWithText(newText);
  } else if (propName === 'exec') {
      const args = callExpr.getArguments().map(a => a.getText());
      callExpr.replaceWithText(`await pgDb.exec(${args.join(', ')})`);
  } else if (propName === 'transaction') {
      const args = callExpr.getArguments();
      if (args.length === 1 && args[0].getKind() === SyntaxKind.ArrowFunction) {
          let arrowFuncBody = args[0].getText();
          if (!arrowFuncBody.startsWith('async')) {
              arrowFuncBody = 'async ' + arrowFuncBody;
          }
          const replacement = `(async (...txArgs) => await pgDb.transaction(async (tRun, tGet, tAll) => { const txFn = ${arrowFuncBody}; return await txFn(...txArgs); }))`;
          callExpr.replaceWithText(replacement);
      }
  }
}

sourceFile.saveSync();

// Use string replace for remaining logic
let updatedCode = fs.readFileSync('server-temp.ts', 'utf-8');
updatedCode = updatedCode.replace(/import Database from 'better-sqlite3';/g, "import { dbRaw as pgDb } from './db-helper';\nimport Database from 'better-sqlite3';");
updatedCode = updatedCode.replace(/try\s*\{\s*dbLocal\.close\(\);\s*\}\s*catch\s*\(e\)\s*\{\}/g, "try { pgDb.close(); } catch(e) {}");

// Replace top-level sync call to await syncFirebaseToSqlite
updatedCode = updatedCode.replace(/syncFirebaseToSqlite\(\);/g, "await syncFirebaseToSqlite();");

// Fix tx calls
updatedCode = updatedCode.replace(/purchaseTx\(\)/g, "await purchaseTx()");
updatedCode = updatedCode.replace(/renewTx\(\)/g, "await renewTx()");
updatedCode = updatedCode.replace(/trialTx\(\)/g, "await trialTx()");
updatedCode = updatedCode.replace(/topupTx\(\)/g, "await topupTx()");
updatedCode = updatedCode.replace(/ticketTx\(\)/g, "await ticketTx()");
updatedCode = updatedCode.replace(/replyTx\(\)/g, "await replyTx()");
updatedCode = updatedCode.replace(/claimTx\(\)/g, "await claimTx()");
updatedCode = updatedCode.replace(/dbTx\(\)/g, "await dbTx()");
updatedCode = updatedCode.replace(/clearTx\(\)/g, "await clearTx()");

// Make callbacks async if they have await inside but aren't async (firebase snapshots)
updatedCode = updatedCode.replace(/onSnapshot\(([\s\S]*?),\s*async\s*\(/g, "onSnapshot($1, async ("); // Already async if it exists?
// Let's just blindly add async to onSnapshot callback if it's not async.
updatedCode = updatedCode.replace(/onSnapshot\((.*?),\s*\((.*?)\)\s*=>\s*\{/g, "onSnapshot($1, async ($2) => {");

// We used pgDb instead of dbRaw natively
// We should check the rest of the TS errors.
// e.g., Spread arguments tuple:
// return await txFn(...txArgs) -> Since it complains about spread arguments:
// TS2556: A spread argument must either have a tuple type or be passed to a rest parameter.

// Replace `await txFn(...txArgs)` with `await txFn()` since they don't take arguments
updatedCode = updatedCode.replace(/\(\.\.\.txArgs\)/g, "()");
updatedCode = updatedCode.replace(/\.\.\.txArgs/g, "");

fs.writeFileSync('server-refactored4.ts', updatedCode);
