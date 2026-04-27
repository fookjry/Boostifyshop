import { Pool } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  host: process.env.PG_HOST,
  port: parseInt(process.env.PG_PORT || '5432', 10),
  user: process.env.PG_USER,
  password: process.env.PG_PASSWORD,
  database: process.env.PG_DATABASE,
});

async function testConnection() {
  try {
    const res = await pool.query('SELECT NOW()');
    console.log('PostgreSQL Connection Successful! Time:', res.rows[0].now);
    process.exit(0);
  } catch (err: any) {
    console.error('PostgreSQL Connection Failed:', err.message);
    process.exit(1);
  }
}

testConnection();
