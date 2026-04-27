import { Project, SyntaxKind, CallExpression } from 'ts-morph';
import fs from 'fs';

const project = new Project();
project.addSourceFilesAtPaths(['server.ts']);
let sourceFile = project.getSourceFileOrThrow('server.ts');

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
      
      let newText = `await db.${propName}(${sqlArg}`;
      if (runArgs.length > 0) {
          newText += `, [${runArgs.join(', ')}]`;
      }
      newText += `)`;
      callExpr.replaceWithText(newText);
  } else if (propName === 'exec') {
      const args = callExpr.getArguments().map(a => a.getText());
      callExpr.replaceWithText(`await db.exec(${args.join(', ')})`);
  } else if (propName === 'transaction') {
      const args = callExpr.getArguments();
      if (args.length === 1 && args[0].getKind() === SyntaxKind.ArrowFunction) {
          let arrowFuncBody = args[0].getText();
          if (!arrowFuncBody.startsWith('async')) {
              arrowFuncBody = 'async ' + arrowFuncBody;
          }
          const replacement = `(async (...txArgs) => await db.transaction(async (tRun, tGet, tAll) => { const txFn = ${arrowFuncBody}; return await txFn(...txArgs); }))`;
          callExpr.replaceWithText(replacement);
      }
  }
}

sourceFile.saveSync();

// Now apply the simple string string replacements using simple regex safely
let updatedCode = fs.readFileSync('server.ts', 'utf-8');
updatedCode = updatedCode.replace(/import Database from 'better-sqlite3';/g, "import { dbRaw as db } from './db-helper';\nimport Database from 'better-sqlite3';");
updatedCode = updatedCode.replace(/let dbLocal:\s*Database\.Database;/g, "");
updatedCode = updatedCode.replace(/dbLocal = new Database\('local_database\.db'\);/g, "");
updatedCode = updatedCode.replace(/dbLocal\s*=\s*new Database\('local_database\.db', \{ readonly: true \}\);/g, "");
updatedCode = updatedCode.replace(/dbLocal\.pragma\('journal_mode = WAL'\);/g, "");
updatedCode = updatedCode.replace(/try\s*\{\s*dbLocal\.close\(\);\s*\}\s*catch\s*\(e\)\s*\{\}/g, "try { db.close(); } catch(e) {}");

// Fix the tx calls. e.g., purchaseTx() -> await purchaseTx()
updatedCode = updatedCode.replace(/purchaseTx\(\)/g, "await purchaseTx()");
updatedCode = updatedCode.replace(/renewTx\(\)/g, "await renewTx()");
updatedCode = updatedCode.replace(/trialTx\(\)/g, "await trialTx()");
updatedCode = updatedCode.replace(/topupTx\(\)/g, "await topupTx()");
updatedCode = updatedCode.replace(/ticketTx\(\)/g, "await ticketTx()");
updatedCode = updatedCode.replace(/replyTx\(\)/g, "await replyTx()");
updatedCode = updatedCode.replace(/claimTx\(\)/g, "await claimTx()");
updatedCode = updatedCode.replace(/dbTx\(\)/g, "await dbTx()");

fs.writeFileSync('server.ts', updatedCode);
