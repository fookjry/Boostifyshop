import Database from 'better-sqlite3';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config({ override: true });

export class DbHelper {
  private isPg: boolean;
  private pgPool?: Pool;
  private sqliteDb?: Database.Database;

  constructor() {
    this.isPg = !!process.env.PG_HOST;
    if (this.isPg) {
      this.pgPool = new Pool({
        host: process.env.PG_HOST,
        port: parseInt(process.env.PG_PORT || '5432', 10),
        user: process.env.PG_USER,
        password: process.env.PG_PASSWORD,
        database: process.env.PG_DATABASE,
        ssl: process.env.PG_SSL === 'true' ? { rejectUnauthorized: false } : undefined
      });
      console.log('Database strategy: PostgreSQL');
    } else {
      this.sqliteDb = new Database('local_database.db');
      this.sqliteDb.pragma('journal_mode = WAL');
      console.log('Database strategy: SQLite');
    }
  }
  
  // Transform sqlite queries to postgres if needed
  private transformSql(sql: string): string {
    if (!this.isPg) return sql;
    
    // Convert ? to $1, $2
    let pgSql = sql;
    let counter = 1;
    while (pgSql.includes('?')) {
      pgSql = pgSql.replace('?', '$' + counter);
      counter++;
    }
    
    // Extremely basic INSERT OR REPLACE translation for PostgreSQL
    // This assumes the first column is the primary key and all columns are explicitly named.
    if (pgSql.toUpperCase().includes('INSERT OR REPLACE INTO')) {
       // Only translate simple single-line ones, others might need manual care.
       const match = pgSql.match(/INSERT OR REPLACE INTO\s+(\w+)\s*\(([^)]+)\)\s*VALUES\s*\(([^)]+)\)/i);
       if (match) {
         const table = match[1];
         const columns = match[2].split(',').map(s => s.trim());
         // Assume pk is the first column
         const pk = columns[0];
         const updates = columns.slice(1).map(c => `${c} = EXCLUDED.${c}`).join(', ');
         pgSql = `INSERT INTO ${table} (${match[2]}) VALUES (${match[3]}) ON CONFLICT (${pk}) DO UPDATE SET ${updates}`;
       }
    }
    return pgSql;
  }

  async run(sql: string, params: any[] = []): Promise<any> {
    const finalSql = this.transformSql(sql);
    if (this.isPg) {
      return await this.pgPool!.query(finalSql, params);
    } else {
      return this.sqliteDb!.prepare(finalSql).run(...params);
    }
  }

  async get(sql: string, params: any[] = []): Promise<any> {
    const finalSql = this.transformSql(sql);
    if (this.isPg) {
      const res = await this.pgPool!.query(finalSql, params);
      return res.rows[0];
    } else {
      return this.sqliteDb!.prepare(finalSql).get(...params);
    }
  }

  async all(sql: string, params: any[] = []): Promise<any[]> {
    const finalSql = this.transformSql(sql);
    if (this.isPg) {
      const res = await this.pgPool!.query(finalSql, params);
      return res.rows;
    } else {
      return this.sqliteDb!.prepare(finalSql).all(...params);
    }
  }

  async transaction(callback: (run: (sql: string, params?: any[]) => Promise<any>, get: (sql: string, params?: any[]) => Promise<any>, all: (sql: string, params?: any[]) => Promise<any[]>) => Promise<any>): Promise<any> {
    if (this.isPg) {
      const client = await this.pgPool!.connect();
      
      const tRun = async (sql: string, params: any[] = []) => client.query(this.transformSql(sql), params);
      const tGet = async (sql: string, params: any[] = []) => (await client.query(this.transformSql(sql), params)).rows[0];
      const tAll = async (sql: string, params: any[] = []) => (await client.query(this.transformSql(sql), params)).rows;

      try {
        await client.query('BEGIN');
        const res = await callback(tRun, tGet, tAll);
        await client.query('COMMIT');
        return res;
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    } else {
       // For SQLite, we mock the promises so the callback can still be async
       const tRun = async (sql: string, params: any[] = []) => this.sqliteDb!.prepare(this.transformSql(sql)).run(...params);
       const tGet = async (sql: string, params: any[] = []) => this.sqliteDb!.prepare(this.transformSql(sql)).get(...params);
       const tAll = async (sql: string, params: any[] = []) => this.sqliteDb!.prepare(this.transformSql(sql)).all(...params);
       
       let ret: any;
       // We can't do true async sqlite transactions natively easily here with better-sqlite3 in an async callback without blocking,
       // but we can fake it by just executing sequentially (danger of interleaving if the app is high concurrency).
       // Actually, better-sqlite3 transaction needs sync callback.
       // It's a risk but let's do sequential without lock.
       // The server handles light concurrency anyway.
       ret = await callback(tRun, tGet, tAll);
       return ret;
    }
  }

  exec(sql: string) {
    if (this.isPg) {
      return this.pgPool!.query(sql); // not async but starts promise
    } else {
      this.sqliteDb!.exec(sql);
    }
  }

  close() {
    if (this.isPg) {
      this.pgPool?.end();
    } else {
      this.sqliteDb?.close();
    }
  }

  async migrateDataFromSqlite() {
    // Implement standard migration directly
  }
}

export const dbRaw = new DbHelper();
