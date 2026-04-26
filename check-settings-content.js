
import Database from 'better-sqlite3';
const dbLocal = new Database('local_database.db');

try {
  const settings = dbLocal.prepare("SELECT * FROM settings").all();
  console.log('Settings:', settings);
} catch (error) {
  console.error('Error:', error);
}
