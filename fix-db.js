import Database from 'better-sqlite3';
const db = new Database('./local_database.db');
db.prepare("UPDATE servers SET supportedAppIcons = '[]', generalUsageIcons = '[]'").run();
console.log('Fixed DB');
