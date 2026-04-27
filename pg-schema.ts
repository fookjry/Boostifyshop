import { pgPool } from './pg-db';

export async function createPostgresTables() {
  const client = await pgPool.connect();
  try {
    await client.query('BEGIN');

    // Create tables matching SQLite schema but using PostgreSQL types
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        uid TEXT PRIMARY KEY,
        email TEXT,
        role TEXT DEFAULT 'user',
        balance REAL DEFAULT 0,
        hasUsedTrial INTEGER DEFAULT 0,
        lastTrialAt TEXT,
        lastAdClaimAt TEXT,
        createdAt TEXT,
        status TEXT DEFAULT 'active'
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS vpns (
        id TEXT PRIMARY KEY,
        userId TEXT,
        serverId TEXT,
        serverName TEXT,
        inboundId INTEGER,
        uuid TEXT,
        config TEXT,
        expireAt TEXT,
        status TEXT,
        network TEXT,
        deviceCount INTEGER,
        clientName TEXT,
        isTrial INTEGER DEFAULT 0,
        isAdClaim INTEGER DEFAULT 0,
        createdAt TEXT
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS servers (
        id TEXT PRIMARY KEY,
        name TEXT,
        host TEXT,
        port INTEGER,
        username TEXT,
        password TEXT,
        description TEXT,
        supportedAppIcons TEXT,
        generalUsageIcons TEXT,
        status TEXT,
        prices TEXT,
        maxUsers INTEGER,
        currentUsers INTEGER DEFAULT 0
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS networks (
        id TEXT PRIMARY KEY,
        name TEXT,
        inboundId INTEGER,
        status TEXT,
        color TEXT
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY,
        userId TEXT,
        userEmail TEXT,
        amount REAL,
        type TEXT,
        timestamp TEXT,
        note TEXT
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS settings (
        id TEXT PRIMARY KEY,
        data TEXT
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS manual_topups (
        id TEXT PRIMARY KEY,
        userId TEXT,
        userEmail TEXT,
        amount REAL,
        slipHash TEXT,
        status TEXT,
        createdAt TEXT
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS linkvertise_sessions (
        id TEXT PRIMARY KEY,
        userId TEXT,
        userEmail TEXT,
        ipAddress TEXT,
        serverId TEXT,
        network TEXT,
        status TEXT,
        createdAt TEXT
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS linkvertise_claims (
        id TEXT PRIMARY KEY,
        userId TEXT,
        ipAddress TEXT,
        claimTime TEXT
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS used_slips (
        id TEXT PRIMARY KEY,
        userId TEXT,
        amount REAL,
        timestamp TEXT
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS tickets (
        id TEXT PRIMARY KEY,
        userId TEXT,
        userEmail TEXT,
        subject TEXT,
        status TEXT,
        priority TEXT,
        createdAt TEXT,
        updatedAt TEXT
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS ticket_messages (
        id TEXT PRIMARY KEY,
        ticketId TEXT,
        userId TEXT,
        userEmail TEXT,
        content TEXT,
        role TEXT,
        timestamp TEXT
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS device_options (
        id TEXT PRIMARY KEY,
        name TEXT,
        count INTEGER,
        price REAL,
        sortOrder INTEGER,
        status INTEGER DEFAULT 1
      );
    `);

    await client.query('COMMIT');
    console.log('✅ PostgreSQL Schema created successfully.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Failed to create PostgreSQL schema:', error);
    throw error;
  } finally {
    client.release();
  }
}
