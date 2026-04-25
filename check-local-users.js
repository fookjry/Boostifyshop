
import Database from 'better-sqlite3';
const db = new Database('local_database.db');
const users = db.prepare("SELECT email FROM users").all();
console.log(`Local total users: ${users.length}`);
const sample = users.slice(0, 10).map(u => u.email);
console.log('Sample Local Emails (first 10):');
sample.forEach(email => console.log(`- ${email}`));
db.close();
