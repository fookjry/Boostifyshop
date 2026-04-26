import Database from 'better-sqlite3';
const db = new Database('local_database.db');
try {
  console.log(db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all());
} catch(e) { console.error(e) }
