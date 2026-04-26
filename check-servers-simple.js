import Database from 'better-sqlite3';
const dbLocal = new Database('local_database.db');

try {
  const servers = dbLocal.prepare("SELECT id, name, host, port FROM servers").all();
  console.log('Servers summary:', servers);
} catch (error) {
  console.error('Error:', error);
}
