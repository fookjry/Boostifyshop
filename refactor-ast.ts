import { Project, SyntaxKind, CallExpression } from 'ts-morph';
import fs from 'fs';

const project = new Project();
project.addSourceFilesAtPaths(['server.ts']);
const sourceFile = project.getSourceFileOrThrow('server.ts');

const callExpressions = sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression);

const replacements: { start: number, end: number, newText: string }[] = [];

callExpressions.forEach(callExpr => {
  const expr = callExpr.getExpression();
  const text = expr.getText();
  const parentCall = callExpr;
  
  if (text.startsWith('dbLocal.prepare(') && text.endsWith('.run')) {
      const parentExpr = text.substring('dbLocal.prepare('.length, text.length - ').run'.length);
      const args = callExpr.getArguments().map(a => a.getText());
      
      let newText = `await db.run(${parentExpr}`;
      if (args.length > 0) {
          newText += `, [${args.join(', ')}]`;
      }
      newText += `)`;
      replacements.push({ start: callExpr.getStart(), end: callExpr.getEnd(), newText });
  } else if (text.startsWith('dbLocal.prepare(') && text.endsWith('.get')) {
      const parentExpr = text.substring('dbLocal.prepare('.length, text.length - ').get'.length);
      const args = callExpr.getArguments().map(a => a.getText());
      
      let newText = `await db.get(${parentExpr}`;
      if (args.length > 0) {
          newText += `, [${args.join(', ')}]`;
      }
      newText += `)`;
      replacements.push({ start: callExpr.getStart(), end: callExpr.getEnd(), newText });
  } else if (text.startsWith('dbLocal.prepare(') && text.endsWith('.all')) {
      const parentExpr = text.substring('dbLocal.prepare('.length, text.length - ').all'.length);
      const args = callExpr.getArguments().map(a => a.getText());
      
      let newText = `await db.all(${parentExpr}`;
      if (args.length > 0) {
          newText += `, [${args.join(', ')}]`;
      }
      newText += `)`;
      replacements.push({ start: callExpr.getStart(), end: callExpr.getEnd(), newText });
  } else if (text === 'dbLocal.exec') {
      const args = callExpr.getArguments().map(a => a.getText());
      replacements.push({ start: callExpr.getStart(), end: callExpr.getEnd(), newText: `await db.exec(${args.join(', ')})` });
  } else if (text === 'dbLocal.transaction') {
      const args = callExpr.getArguments();
      if (args.length === 1 && args[0].getKind() === SyntaxKind.ArrowFunction) {
          const arrowFuncBody = args[0].getText();
          const replacement = `(async (...txArgs) => await db.transaction(async (tRun, tGet, tAll) => { const txFn = ${arrowFuncBody}; return await txFn(...txArgs); }))`;
          replacements.push({ start: callExpr.getStart(), end: callExpr.getEnd(), newText: replacement });
      }
  }
});

// Sort by start position descending (back to front) so replacements don't invalidate indices
replacements.sort((a, b) => b.start - a.start);

let updatedCode = sourceFile.getFullText();
replacements.forEach(r => {
    updatedCode = updatedCode.substring(0, r.start) + r.newText + updatedCode.substring(r.end);
});

updatedCode = updatedCode.replace(/import Database from 'better-sqlite3';/g, "import { dbRaw as db } from './db-helper';\nimport Database from 'better-sqlite3';");
updatedCode = updatedCode.replace(/let dbLocal:\s*Database\.Database;/g, "");
updatedCode = updatedCode.replace(/dbLocal = new Database\('local_database\.db'\);/g, "");
updatedCode = updatedCode.replace(/dbLocal\.pragma\('journal_mode = WAL'\);/g, "");
updatedCode = updatedCode.replace(/try\s*\{\s*dbLocal\.close\(\);\s*\}\s*catch\s*\(e\)\s*\{\}/g, "try { db.close(); } catch(e) {}");

fs.writeFileSync('server-refactored.ts', updatedCode);
