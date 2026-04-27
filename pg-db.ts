import { Pool } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config({ override: true });

export const pgPool = new Pool({
  host: process.env.PG_HOST,
  port: parseInt(process.env.PG_PORT || '5432', 10),
  user: process.env.PG_USER,
  password: process.env.PG_PASSWORD,
  database: process.env.PG_DATABASE,
  // Add ssl configuration if needed, for public IP might need disable SSL reject if not set up
  ssl: process.env.PG_SSL === 'true' ? { rejectUnauthorized: false } : undefined
});

export async function testPgConnection() {
  try {
    const client = await pgPool.connect();
    console.log('✅ PostgreSQL successfully connected!');
    client.release();
    return true;
  } catch (error: any) {
    console.error('❌ PostgreSQL connection failed:', error.message);
    return false;
  }
}
