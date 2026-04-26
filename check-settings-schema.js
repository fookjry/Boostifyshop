
import Database from 'better-sqlite3';
const dbLocal = new Database('local_database.db');

try {
  const columns = dbLocal.prepare("PRAGMA table_info(settings)").all();
  console.log('Columns in settings table:', columns);
} catch (error) {
  console.error('Error:', error);
}
