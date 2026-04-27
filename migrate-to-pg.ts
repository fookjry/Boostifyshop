import Database from 'better-sqlite3';
import { pgPool, testPgConnection } from './pg-db';
import { createPostgresTables } from './pg-schema';

const tablesToMigrate = [
  'users',
  'vpns',
  'servers',
  'networks',
  'transactions',
  'settings',
  'manual_topups',
  'linkvertise_sessions',
  'linkvertise_claims',
  'used_slips',
  'tickets',
  'ticket_messages',
  'device_options'
];

async function migrateData() {
  const isConnected = await testPgConnection();
  if (!isConnected) {
    console.error('Cannot migrate, PostgreSQL connection failed.');
    process.exit(1);
  }

  console.log('--- Start Migration ---');
  await createPostgresTables();

  const dbLocal = new Database('local_database.db', { readonly: true });
  const client = await pgPool.connect();

  try {
    for (const tableName of tablesToMigrate) {
      console.log(`Migrating table: ${tableName}`);
      const rows = dbLocal.prepare(`SELECT * FROM ${tableName}`).all() as any[];
      if (rows.length === 0) {
        console.log(`Table ${tableName} is empty, skipping.`);
        continue;
      }

      const columns = Object.keys(rows[0]);
      
      // We will perform batched inserts or simple inserts
      await client.query('BEGIN');
      
      for (const row of rows) {
        const values = columns.map(col => row[col]);
        const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
        const sql = `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`;
        
        await client.query(sql, values);
      }
      
      await client.query('COMMIT');
      console.log(`✅ Table ${tableName} migrated (${rows.length} rows).`);
    }
    console.log('🎉 Migration Completed Successfully!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration error:', error);
  } finally {
    client.release();
    dbLocal.close();
    process.exit(0);
  }
}

migrateData();
