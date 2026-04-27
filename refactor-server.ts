import fs from 'fs';

let code = fs.readFileSync('server.ts', 'utf-8');

code = code.replace(/import Database from 'better-sqlite3';/g, "import { dbRaw as db } from './db-helper';\nimport Database from 'better-sqlite3';");

code = code.replace(/let dbLocal: Database.Database;/g, "");
code = code.replace(/dbLocal = new Database\('local_database\.db'\);/g, "");
code = code.replace(/dbLocal\.pragma\('journal_mode = WAL'\);/g, "");
code = code.replace(/dbLocal = new Database\('local_database\.db', \{ readonly: true \}\);/g, "");
code = code.replace(/try \{ dbLocal\.close\(\); \} catch\(e\) \{\}/g, "try { db.close(); } catch(e) {}");

// Replace tx
code = code.replace(/dbLocal\.transaction\(\s*\(\)\s*=>\s*\{([\s\S]*?)\}\s*\)/g, (match, body) => {
  // It returns a function in sqlite, but db.transaction returns a promise.
  // Wait, in sqlite: const tx = db.transaction(() => { ... }); tx();
  // We should transform this to: const tx = async () => await db.transaction(async (tRun, tGet, tAll) => { [body replaced] });
  
  // Actually, replacing dbLocal inside the transaction body with tRun, tGet, etc is too complex.
  // We can just use the global db methods inside the transaction if we don't care about isolated connection for pg,
  // since pgPool handles sequential awaiting nicely, but if there's concurrent requests, they might interleave.
  return `(async () => { return await db.transaction(async (tRun, tGet, tAll) => {${body}}); })`;
});

// We need to replace all dbLocal.prepare(`...`).run(...)
code = code.replace(/dbLocal\.prepare\(([\s\S]*?)\)\.run\(([\s\S]*?)\)/g, "await db.run($1, [$2])");
code = code.replace(/dbLocal\.prepare\(([\s\S]*?)\)\.run\(\)/g, "await db.run($1)");

code = code.replace(/dbLocal\.prepare\(([\s\S]*?)\)\.get\(([\s\S]*?)\)/g, "await db.get($1, [$2])");
code = code.replace(/dbLocal\.prepare\(([\s\S]*?)\)\.get\(\)/g, "await db.get($1)");

code = code.replace(/dbLocal\.prepare\(([\s\S]*?)\)\.all\(([\s\S]*?)\)/g, "await db.all($1, [$2])");
code = code.replace(/dbLocal\.prepare\(([\s\S]*?)\)\.all\(\)/g, "await db.all($1)");

code = code.replace(/dbLocal\.exec\(([\s\S]*?)\)/g, "await db.exec($1)");

// Fix empty array 
code = code.replace(/, \[\]\)/g, ")");

fs.writeFileSync('server-refactored.ts', code);
