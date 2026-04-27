import Database from 'better-sqlite3';
const db = new Database('./local_database.db');
const rows = db.prepare("SELECT id, name, supportedAppIcons, generalUsageIcons FROM servers LIMIT 10").all();
console.log(JSON.stringify(rows, null, 2));
