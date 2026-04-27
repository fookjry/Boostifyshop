import fs from 'fs';

let content = fs.readFileSync('server.ts', 'utf-8');

// The strategy is to replace:
// dbLocal.prepare('...').run(...) -> await dbQuery('...', [...])
// dbLocal.prepare('...').get(...) -> await dbQuery('...', [...], { type: 'get' })
// dbLocal.prepare('...').all(...) -> await dbQuery('...', [...], { type: 'all' })
// dbLocal.transaction(...) -> await dbTransaction(async () => { ... })

// Actually, it's easier to create a pg wrapper that somewhat mimics the SQL used across SQLite
// SQLite uses `?`, postgres uses `$1`. We can translate `?` to `$1` inside `dbQuery`.

const functionWrapper = `
import { pgPool } from './pg-db';

async function dbQuery(sql: string, params: any[] = [], type: 'run' | 'get' | 'all' = 'run') {
  if (!process.env.PG_HOST) {
     // fallback to sqlite
     if (type === 'run') return dbLocal.prepare(sql).run(...params);
     if (type === 'get') return dbLocal.prepare(sql).get(...params);
     if (type === 'all') return dbLocal.prepare(sql).all(...params);
  }

  // Translate ? to $1, $2, etc for postgres
  let pgSql = sql;
  let counter = 1;
  while (pgSql.includes('?')) {
    pgSql = pgSql.replace('?', '$' + counter);
    counter++;
  }

  const result = await pgPool.query(pgSql, params);
  
  if (type === 'get') return result.rows[0];
  if (type === 'all') return result.rows;
  return result; // for run
}

async function dbTransaction(callback: () => Promise<void>) {
  if (!process.env.PG_HOST) {
    return dbLocal.transaction(callback as any)(); // Try to handle in sync for sqlite, or we might need async sqlite if we change it. Wait, sqlite transaction requires sync. This might be tricky.
  }
  const client = await pgPool.connect();
  try {
    await client.query('BEGIN');
    await callback(); // The callback would need to use dbQuery passing the client to ensure it's in the same transaction, or we just trust the connection pool if we don't pass client. Wait, pool.query uses ANY connection. Transactions must use the SAME client!
    await client.query('COMMIT');
  } catch(e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}
`

// Because transactions need the same client, maybe it's simpler to use a single persistent client per transaction or just not use transactions for now, or adapt it.

// Let's print out how many occurrences there are of dbLocal.transaction
console.log("Transactions:", (content.match(/dbLocal\.transaction/g) || []).length);
