import * as dotenv from "dotenv";
dotenv.config({ override: true });

import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import axios from "axios";
import helmet from "helmet";
import cors from "cors";
import { v4 as uuidv4 } from 'uuid';
import { rateLimit } from "express-rate-limit";
import crypto from "crypto";
import fs from 'fs';
import Database from 'better-sqlite3';
import { initializeApp as initializeAdminApp, getApps as getAdminApps } from "firebase-admin/app";
import { getAuth as getAdminAuth } from "firebase-admin/auth";
import { getFirestore as getAdminFirestore } from "firebase-admin/firestore";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, collection, getDoc, getDocs, addDoc, updateDoc, setDoc, deleteDoc, runTransaction, increment, serverTimestamp, query, where, limit } from "firebase/firestore";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import firebaseConfig from "./firebase-applet-config.json" with { type: "json" };

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  
  if (error instanceof Error && (error.message.includes('permission') || error.message.includes('PERMISSION_DENIED'))) {
     throw new Error(JSON.stringify(errInfo));
  }
  throw error;
}

let dbLocal: Database.Database;
try {
  dbLocal = new Database('local_database.db');
  // Initial check or setup
  dbLocal.pragma('journal_mode = WAL');
  
  // Verify integrity or just let the first exec fail and catch it
} catch (error: any) {
  console.error('Failed to open database, may be corrupted:', error);
  if (error.code === 'SQLITE_CORRUPT' || error.message.includes('malformed')) {
    const backupName = `local_database.db.corrupt.${Date.now()}`;
    console.warn(`Database corrupted! Renaming to ${backupName} and recreating.`);
    if (fs.existsSync('local_database.db')) {
      fs.renameSync('local_database.db', backupName);
    }
    dbLocal = new Database('local_database.db');
  } else {
    throw error;
  }
}

// Initialize Local Database tables
try {
  dbLocal.exec(`
    CREATE TABLE IF NOT EXISTS users (
      uid TEXT PRIMARY KEY,
      email TEXT,
      role TEXT DEFAULT 'user',
      balance REAL DEFAULT 0,
      hasUsedTrial INTEGER DEFAULT 0,
      lastTrialAt TEXT,
      lastAdClaimAt TEXT,
      createdAt TEXT
    );

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

  CREATE TABLE IF NOT EXISTS networks (
    id TEXT PRIMARY KEY,
    name TEXT,
    inboundId INTEGER,
    status TEXT,
    color TEXT
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    userId TEXT,
    userEmail TEXT,
    amount REAL,
    type TEXT,
    timestamp TEXT,
    note TEXT
  );

  CREATE TABLE IF NOT EXISTS settings (
    id TEXT PRIMARY KEY,
    data TEXT
  );

  CREATE TABLE IF NOT EXISTS manual_topups (
    id TEXT PRIMARY KEY,
    userId TEXT,
    userEmail TEXT,
    amount REAL,
    slipHash TEXT,
    status TEXT,
    createdAt TEXT
  );

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

  CREATE TABLE IF NOT EXISTS linkvertise_claims (
    id TEXT PRIMARY KEY,
    userId TEXT,
    ipAddress TEXT,
    claimTime TEXT
  );

  CREATE TABLE IF NOT EXISTS used_slips (
    id TEXT PRIMARY KEY,
    userId TEXT,
    amount REAL,
    timestamp TEXT
  );

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

  CREATE TABLE IF NOT EXISTS ticket_messages (
    id TEXT PRIMARY KEY,
    ticketId TEXT,
    userId TEXT,
    userEmail TEXT,
    content TEXT,
    role TEXT,
    timestamp TEXT
  );

  CREATE TABLE IF NOT EXISTS device_options (
    id TEXT PRIMARY KEY,
    name TEXT,
    count INTEGER,
    price REAL,
    sortOrder INTEGER,
    status INTEGER DEFAULT 1
  );
`);
} catch (error: any) {
  if (error.code === 'SQLITE_CORRUPT' || error.message.includes('malformed')) {
    const backupName = `local_database.db.corrupt.${Date.now()}`;
    console.warn(`Database corrupted during initialization! Renaming to ${backupName} and recreating.`);
    try { dbLocal.close(); } catch(e) {}
    if (fs.existsSync('local_database.db')) {
      fs.renameSync('local_database.db', backupName);
    }
    dbLocal = new Database('local_database.db');
    // Try to initialize one more time
    dbLocal.exec(`
      CREATE TABLE IF NOT EXISTS users (
        uid TEXT PRIMARY KEY,
        email TEXT,
        role TEXT DEFAULT 'user',
        balance REAL DEFAULT 0,
        hasUsedTrial INTEGER DEFAULT 0,
        lastTrialAt TEXT,
        lastAdClaimAt TEXT,
        createdAt TEXT
      );

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

      CREATE TABLE IF NOT EXISTS networks (
        id TEXT PRIMARY KEY,
        name TEXT,
        inboundId INTEGER,
        status TEXT,
        color TEXT
      );

      CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY,
        userId TEXT,
        userEmail TEXT,
        amount REAL,
        type TEXT,
        timestamp TEXT,
        note TEXT
      );

      CREATE TABLE IF NOT EXISTS settings (
        id TEXT PRIMARY KEY,
        data TEXT
      );

      CREATE TABLE IF NOT EXISTS manual_topups (
        id TEXT PRIMARY KEY,
        userId TEXT,
        userEmail TEXT,
        amount REAL,
        slipHash TEXT,
        status TEXT,
        createdAt TEXT
      );

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

      CREATE TABLE IF NOT EXISTS linkvertise_claims (
        id TEXT PRIMARY KEY,
        userId TEXT,
        ipAddress TEXT,
        claimTime TEXT
      );

      CREATE TABLE IF NOT EXISTS used_slips (
        id TEXT PRIMARY KEY,
        userId TEXT,
        amount REAL,
        timestamp TEXT
      );

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

      CREATE TABLE IF NOT EXISTS ticket_messages (
        id TEXT PRIMARY KEY,
        ticketId TEXT,
        userId TEXT,
        userEmail TEXT,
        content TEXT,
        role TEXT,
        timestamp TEXT
      );

      CREATE TABLE IF NOT EXISTS device_options (
        id TEXT PRIMARY KEY,
        name TEXT,
        count INTEGER,
        price REAL,
        sortOrder INTEGER,
        status INTEGER DEFAULT 1
      );
    `);
  } else {
    throw error;
  }
}

try { dbLocal.prepare('ALTER TABLE servers ADD COLUMN description TEXT').run(); } catch(e) {}
try { dbLocal.prepare('ALTER TABLE servers ADD COLUMN supportedAppIcons TEXT').run(); } catch(e) {}
try { dbLocal.prepare('ALTER TABLE servers ADD COLUMN generalUsageIcons TEXT').run(); } catch(e) {}
try { dbLocal.prepare('ALTER TABLE networks ADD COLUMN color TEXT').run(); } catch(e) {}
try { dbLocal.prepare('ALTER TABLE device_options ADD COLUMN sortOrder INTEGER').run(); } catch(e) {}
try { dbLocal.prepare('ALTER TABLE device_options ADD COLUMN status INTEGER DEFAULT 1').run(); } catch(e) {}
try { dbLocal.prepare('ALTER TABLE device_options ADD COLUMN name TEXT').run(); } catch(e) {}

function getSetting(id: string, fallback: any = {}) {
  try {
    const row: any = dbLocal.prepare('SELECT data FROM settings WHERE id = ?').get(id);
    return row ? JSON.parse(row.data) : fallback;
  } catch (e) {
    return fallback;
  }
}

const firebaseAppConfig = {
  apiKey: process.env.FIREBASE_API_KEY || firebaseConfig.apiKey,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || firebaseConfig.authDomain,
  projectId: firebaseConfig.projectId, // Force use of the client JSON config to prevent audience mismatch!
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || firebaseConfig.storageBucket,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || firebaseConfig.messagingSenderId,
  appId: process.env.FIREBASE_APP_ID || firebaseConfig.appId,
};

const firebaseApp = initializeApp(firebaseAppConfig);
const auth = getAuth(firebaseApp);
const databaseId = process.env.FIREBASE_DATABASE_ID || (firebaseConfig as any).firestoreDatabaseId;
const dbFirestore = getFirestore(firebaseApp, databaseId);

async function syncFirestoreToLocal() {
  const log = (msg: string) => {
    console.log(msg);
    fs.appendFileSync('sync_log.txt', `[${new Date().toISOString()}] ${msg}\n`);
  };
  
  log(`🔄 Starting Firestore to SQLite sync (Client SDK)... User: ${auth.currentUser?.email || 'Not Logged In'}`);
  if (!auth.currentUser) {
    log('❌ Aborting sync: User not logged in.');
    return;
  }
  
  const collections = [
    { name: 'users', table: 'users' },
    { name: 'servers', table: 'servers' },
    { name: 'networks', table: 'networks' },
    { name: 'vpns', table: 'vpns' },
    { name: 'transactions', table: 'transactions' },
    { name: 'manual_topups', table: 'manual_topups' },
    { name: 'tickets', table: 'tickets' },
    { name: 'device_options', table: 'device_options' },
    { name: 'settings', table: 'settings' }
  ];

  for (const col of collections) {
    try {
      const snap = await getDocs(collection(dbModular, col.name));
      log(`📡 Found ${snap.size} documents in Firestore [${col.name}]`);
      
      for (const doc of snap.docs) {
        const data = doc.data();
        const id = doc.id;
        
        if (col.table === 'users') {
          dbLocal.prepare(`
            INSERT OR REPLACE INTO users (uid, email, role, balance, hasUsedTrial, lastTrialAt, lastAdClaimAt, createdAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `).run(id, data.email || '', data.role || 'user', Number(data.balance || 0), data.hasUsedTrial ? 1 : 0, data.lastTrialAt || null, data.lastAdClaimAt || null, data.createdAt || new Date().toISOString());
        } else if (col.table === 'servers') {
           const stringifyField = (val: any) => {
             if (val === undefined || val === null) return '[]';
             if (typeof val === 'string') {
               // If it looks like a JSON string already, don't re-encode
               if (val.trim().startsWith('[') || val.trim().startsWith('{')) return val;
               return val; // It's just a string
             }
             return JSON.stringify(val);
           };

           dbLocal.prepare(`
            INSERT OR REPLACE INTO servers (id, name, host, port, username, password, description, supportedAppIcons, generalUsageIcons, status, prices, maxUsers, currentUsers)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            id, 
            data.name || '', 
            data.host || '', 
            Number(data.port || 0), 
            data.username || '', 
            data.password || '', 
            data.description || '', 
            stringifyField(data.supportedAppIcons), 
            stringifyField(data.generalUsageIcons), 
            data.status || 'offline', 
            typeof data.prices === 'string' ? data.prices : JSON.stringify(data.prices || {}), 
            Number(data.maxUsers || 100), 
            Number(data.currentUsers || 0)
          );
        } else if (col.table === 'networks') {
           dbLocal.prepare(`INSERT OR REPLACE INTO networks (id, name, inboundId, status, color) VALUES (?, ?, ?, ?, ?)`)
                  .run(id, data.name || '', Number(data.inboundId || 0), data.status || 'open', data.color || 'emerald');
        } else if (col.table === 'settings') {
           dbLocal.prepare(`INSERT OR REPLACE INTO settings (id, data) VALUES (?, ?)`)
                  .run(id, typeof data === 'string' ? data : JSON.stringify(data));
        } else if (col.table === 'vpns') {
           dbLocal.prepare(`
            INSERT OR REPLACE INTO vpns (id, userId, serverId, serverName, inboundId, uuid, config, expireAt, status, network, deviceCount, clientName, isTrial, isAdClaim, createdAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(id, data.userId || '', data.serverId || '', data.serverName || '', Number(data.inboundId || 0), data.uuid || '', data.config || '', data.expireAt || '', data.status || 'active', data.network || '', Number(data.deviceCount || 1), data.clientName || '', data.isTrial ? 1 : 0, data.isAdClaim ? 1 : 0, data.createdAt || new Date().toISOString());
        } else if (col.table === 'transactions') {
           dbLocal.prepare(`INSERT OR REPLACE INTO transactions (id, userId, userEmail, amount, type, timestamp, note) VALUES (?, ?, ?, ?, ?, ?, ?)`)
                  .run(id, data.userId || '', data.userEmail || '', Number(data.amount || 0), data.type || '', String(data.timestamp || ''), data.note || '');
        } else if (col.table === 'manual_topups') {
           dbLocal.prepare(`INSERT OR REPLACE INTO manual_topups (id, userId, userEmail, amount, slipHash, status, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)`)
                  .run(id, data.userId || '', data.userEmail || '', Number(data.amount || 0), data.slipHash || '', data.status || 'pending', data.createdAt || '');
        } else if (col.table === 'tickets') {
           dbLocal.prepare(`INSERT OR REPLACE INTO tickets (id, userId, userEmail, subject, status, priority, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
                  .run(id, data.userId || '', data.userEmail || '', data.subject || '', data.status || 'open', data.priority || 'medium', data.createdAt || '', data.updatedAt || '');
        } else if (col.table === 'device_options') {
           dbLocal.prepare(`INSERT OR REPLACE INTO device_options (id, name, count, price, sortOrder, status) VALUES (?, ?, ?, ?, ?, ?)`)
                  .run(id, data.name || '', Number(data.count || 0), Number(data.price || 0), Number(data.sortOrder || 0), data.status ? 1 : 0);
        }
      }
    } catch (e: any) {
      log(`⚠️ Failed to sync collection [${col.name}]: ${e.message}`);
    }
  }
  log('✅ Firestore to SQLite sync completed.');
}

// Initialize Admin App for Auth token verification
const projectId = firebaseAppConfig.projectId;
process.env.GCLOUD_PROJECT = projectId;
process.env.GOOGLE_CLOUD_PROJECT = projectId;
process.env.FIREBASE_PROJECT_ID = projectId;
process.env.FIREBASE_CONFIG = JSON.stringify({
  projectId: projectId,
  storageBucket: firebaseAppConfig.storageBucket,
});

// Use a named app to avoid conflicts with the default app initialized by the environment
const adminApp = getAdminApps().find(app => app.name === 'admin-app') || initializeAdminApp({
  projectId: projectId,
  storageBucket: firebaseAppConfig.storageBucket,
}, 'admin-app');

console.log(`Admin SDK initialized with project: ${adminApp.options.projectId} (App Name: ${adminApp.name})`);

const dbModular = getFirestore(firebaseApp, databaseId);
const db = {
  collection: (path: string) => {
    const collRef = collection(dbModular, path);
    return {
      doc: (id?: string) => {
        const docRef = id ? doc(dbModular, path, id) : doc(collRef);
        const docProxy = Object.assign(docRef, {
          get: () => getDoc(docRef),
          set: (data: any, options?: any) => setDoc(docRef, data, options),
          update: (data: any) => updateDoc(docRef, data),
          delete: () => deleteDoc(docRef),
          collection: (subPath: string) => {
            const fullPath = `${path}/${docRef.id}/${subPath}`;
            return db.collection(fullPath);
          }
        });
        return docProxy;
      },
      add: (data: any) => addDoc(collRef, data),
      get: () => getDocs(collRef)
    };
  },
  runTransaction: (callback: any) => runTransaction(dbModular, callback)
};

const FieldValue = {
  increment: (n: number) => increment(n),
  serverTimestamp: () => serverTimestamp()
};
console.log(`Firestore Client SDK (Proxy) initialized with project: ${firebaseAppConfig.projectId}, database: ${databaseId || '(default)'}`);

// Authenticate Server (Required for Client SDK DB access)
async function authenticateServer() {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, "server@local.host", "server_password_123");
    console.log("Server authenticated successfully. UID:", userCredential.user.uid);
    
    // Ensure server user is an admin in Firestore
    try {
      const userRef = db.collection('users').doc(userCredential.user.uid);
      const userSnap = await userRef.get();
      if (!userSnap.exists() || userSnap.data()?.role !== 'admin') {
        console.log("Setting server user as admin in Firestore...");
        await userRef.set({
          email: "server@local.host",
          role: "admin",
          balance: 0,
          createdAt: new Date().toISOString()
        }, { merge: true });
      }
    } catch (dbError: any) {
      console.error("Failed to ensure server admin role in Firestore:", dbError.message);
    }

    // Test Firestore connectivity using Admin SDK
    try {
      const testDoc = await db.collection('settings').doc('global').get();
      if (testDoc.exists()) {
        console.log("Firestore server-side connection test: SUCCESS (Admin SDK)");
        await syncFirestoreToLocal();
      } else {
        console.log("Firestore server-side connection test: SUCCESS (Document not found but reachable via Admin SDK)");
        await syncFirestoreToLocal();
      }
    } catch (connError: any) {
      console.error("Firestore server-side connection test: FAILED", connError.message);
    }
  } catch (error: any) {
    if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential' || error.code === 'auth/invalid-login-credentials') {
      try {
        const userCredential = await createUserWithEmailAndPassword(auth, "server@local.host", "server_password_123");
        console.log("Server user created and authenticated. UID:", userCredential.user.uid);
        
        // Set admin role for new server user
        await db.collection('users').doc(userCredential.user.uid).set({
          email: "server@local.host",
          role: "admin",
          balance: 0,
          createdAt: new Date().toISOString()
        });
      } catch (createError) {
        console.error("Failed to create server user:", createError);
      }
    } else {
      console.error("Server authentication failed:", error);
    }
  }
}
await authenticateServer();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper: match receiver name (slip abbreviated vs full name in settings)
function matchReceiverName(slipName: string, configName: string): boolean {
  let slipClean = slipName.trim();
  let configClean = configName.trim();
  if (!slipClean || !configClean) return false;

  const titles = ['นาย\\s*', 'นาง\\s*', 'นางสาว\\s*', 'Mr\\.\\s*', 'Mrs\\.\\s*', 'Ms\\.\\s*', 'Miss\\s*', 'Mr\\s+', 'Mrs\\s+', 'Ms\\s+'];
  for (const t of titles) {
    const regex = new RegExp('^' + t, 'iu');
    slipClean = slipClean.replace(regex, '');
    configClean = configClean.replace(regex, '');
  }
  slipClean = slipClean.trim();
  configClean = configClean.trim();
  if (!slipClean || !configClean) return false;

  const slipParts = slipClean.split(/\s+/);
  const configParts = configClean.split(/\s+/);

  if (slipParts[0].toLowerCase() !== configParts[0].toLowerCase()) {
    return false;
  }

  if (slipParts.length > 1 && configParts.length > 1) {
    const slipLast = slipParts[slipParts.length - 1];
    const configLast = configParts[configParts.length - 1];

    if (slipLast.length <= 2) {
      const configPrefix = configLast.substring(0, slipLast.length);
      if (configPrefix.toLowerCase() !== slipLast.toLowerCase()) {
        return false;
      }
    } else {
      if (slipLast.toLowerCase() !== configLast.toLowerCase()) {
        return false;
      }
    }
  }

  return true;
}

  // --- Discord Webhook Helper ---
  async function sendDiscordNotification(content: string) {
    try {
      const globalSettings = getSetting('global');
      const webhookUrl = globalSettings?.discordWebhookUrl;
      
      if (webhookUrl && webhookUrl.includes('discord') && webhookUrl.includes('api/webhooks/')) {
        await axios.post(webhookUrl, { 
          content,
          username: "Ticket Monitoring",
          avatar_url: "https://cdn.discordapp.com/embed/avatars/0.png"
        }).catch(err => {
          console.error("Failed to send webhook to Discord:", err.message);
        });
      } else {
        if (webhookUrl) console.log("Discord webhook URL is invalid format:", webhookUrl);
      }
    } catch (error) {
      console.error("Discord Notification Error:", error);
    }
  }

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Trust proxy for rate limiting (Cloud Run/Nginx)
  // Set to 1 to trust the first proxy (e.g., Cloud Run load balancer)
  app.set('trust proxy', 1);

  // Security Middlewares
  app.use(helmet({
    contentSecurityPolicy: false, // Disable CSP for Vite dev server compatibility
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: false, // Allow Firebase popups to communicate back
  }));
  app.use(cors());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ limit: '10mb', extended: true }));

  // Simple logging middleware
  app.use((req, res, next) => {
    if (process.env.NODE_ENV === "production") {
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    }
    next();
  });

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ 
      status: "ok", 
      timestamp: new Date().toISOString(),
      env: process.env.NODE_ENV || "development"
    });
  });

  // Rate Limiting
  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: { error: "Too many requests from this IP, please try again after 15 minutes" },
    standardHeaders: true,
    legacyHeaders: false,
  });

  const topupLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // Limit each IP to 10 topup attempts per hour
    message: { error: "Too many topup attempts, please try again in an hour" },
  });

  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // Limit each IP to 20 login attempts per 15 minutes
    message: { error: "Too many login attempts, please try again after 15 minutes" },
  });

  const purchaseLimiter = rateLimit({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 5, // Limit each IP to 5 purchase attempts per 10 minutes
    message: { error: "Too many purchase attempts, please try again after 10 minutes" },
  });

  // Apply limiters to sensitive routes
  app.use("/api/auth/login", loginLimiter);
  app.use("/api/vpn/purchase", purchaseLimiter);
  app.use("/api/vpn/trial", purchaseLimiter);
  app.use("/api/topup/verify", topupLimiter);

  // Auth Middleware
  app.get("/api/debug-auth", (req, res) => {
    res.json({
      processProjectId: process.env.FIREBASE_PROJECT_ID,
      configProjectId: firebaseConfig.projectId,
      adminAppProjectId: adminApp.options.projectId,
      adminAppName: adminApp.name
    });
  });

  const authenticate = async (req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: "Unauthorized: No token provided" });
    }

    const idToken = authHeader.split('Bearer ')[1];
    try {
      const decodedToken = await getAdminAuth(adminApp).verifyIdToken(idToken);
      req.user = decodedToken;
      next();
    } catch (error: any) {
      console.error("Token verification failed details:", error, "Token part:", idToken.substring(0, 10) + "...");
      res.status(401).json({ error: "Unauthorized: Invalid token", details: error.message });
    }
  };

  const adminOnly = async (req: any, res: any, next: any) => {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    
    const { uid, email } = req.user;
    const isDefaultAdmin = (email === "jry.fook@gmail.com");
    const isServerAdmin = (email === "server@local.host");
    
    if (isDefaultAdmin || isServerAdmin) {
      return next();
    }

    try {
      const user = dbLocal.prepare('SELECT role FROM users WHERE uid = ?').get(uid) as any;
      if (user?.role === 'admin') {
        return next();
      }
    } catch (error: any) {
      return res.status(403).json({ error: "Forbidden: Admin check failed", details: error.message });
    }

    res.status(403).json({ error: "Forbidden: Admin access required" });
  };

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Real 3x-ui Integration Helper
  const createVpnConfig = async (userEmail: string, server: any, inboundId: number, days: number, network: string, prefix?: string, deviceCount: number = 1) => {
    let { host, port, username, password } = server;
    
    // 1. Parse and Clean Host/Path
    let protocol = "http";
    if (host.startsWith("https://")) {
      protocol = "https";
      host = host.replace("https://", "");
    } else if (host.startsWith("http://")) {
      protocol = "http";
      host = host.replace("http://", "");
    }
    
    const hostParts = host.split('/');
    const domain = hostParts[0];
    const basePath = hostParts.slice(1).join('/');
    const cleanBasePath = basePath ? `/${basePath.replace(/\/+$/, "").replace(/^\/+/, "")}` : "";
    const baseUrl = `${protocol}://${domain}:${port}${cleanBasePath}`;
    
    try {
      // 2. Login to 3x-ui
      // Common login endpoints for various 3x-ui versions
      const loginEndpoints = [
        `${baseUrl}/login`, 
        `${baseUrl}/panel/login`,
        `${baseUrl}/xui/login`,
        baseUrl
      ].filter((v, i, a) => a.indexOf(v) === i);

      let loginRes: any = null;
      let detailedError = "";

      for (const endpoint of loginEndpoints) {
        try {
          console.log(`Attempting login at: ${endpoint}`);
          const params = new URLSearchParams();
          params.append('username', username);
          params.append('password', password);
          
          const res = await axios.post(endpoint, params.toString(), { 
            headers: { 
              'Content-Type': 'application/x-www-form-urlencoded',
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            },
            timeout: 8000,
            validateStatus: (status) => status < 500
          });
          
          // 3x-ui usually returns 200 with { success: true } and a cookie
          const isSuccess = res.status === 200 && (res.data?.success === true || res.headers['set-cookie']);
          
          if (isSuccess) {
            loginRes = res;
            console.log(`Login successful at: ${endpoint}`);
            break;
          } else if (res.status === 200 && res.data?.success === false) {
            detailedError = `Invalid credentials at ${endpoint}: ${res.data.msg || 'Unknown error'}`;
          }
        } catch (err: any) {
          const msg = err.response?.data?.msg || err.message;
          console.log(`Endpoint ${endpoint} failed: ${msg}`);
          detailedError = `Connection failed: ${msg}`;
        }
      }

      if (!loginRes) {
        throw new Error(detailedError || "Could not connect to 3x-ui panel. Please check Host, Port, and Credentials.");
      }

      const cookie = loginRes.headers['set-cookie'];
      if (!cookie) throw new Error("Login successful but no session cookie received. Ensure your panel is not behind a restrictive proxy.");
      const cookieStr = cookie.join('; ');

      // 3. Fetch Inbound Details to get actual settings (Port, Transport, Security)
      const getInboundRes = await axios.get(`${baseUrl}/panel/api/inbounds/get/${inboundId}`, {
        headers: { 'Cookie': cookieStr }
      });

      if (!getInboundRes.data.success) {
        throw new Error(`Inbound ID ${inboundId} not found on server.`);
      }

      const inbound = getInboundRes.data.obj;
      const protocol = inbound.protocol; // vless, vmess, trojan, shadowsocks
      const streamSettings = JSON.parse(inbound.streamSettings);
      const transport = streamSettings.network; // ws, grpc, tcp, etc.
      const security = streamSettings.security; // tls, reality, none
      const inboundPort = inbound.port;

      // 4. Prepare Client Data
      const uuid = uuidv4();
      const emailPrefix = userEmail.split('@')[0].replace(/[^a-zA-Z0-9]/g, '').substring(0, 5);
      const clientName = `${prefix ? prefix + '-' : ''}${emailPrefix}${emailPrefix ? '-' : ''}${uuid.substring(0, 8)}`;
      const expiryTime = Date.now() + (days * 24 * 60 * 60 * 1000);

      const client = {
        email: clientName,
        limitIp: deviceCount,
        totalGB: 0,
        expiryTime: expiryTime,
        enable: true,
        tgId: "",
        subId: ""
      };

      // Set ID/Password/Secret based on protocol
      if (protocol === "trojan") {
        (client as any).password = uuid;
      } else if (protocol === "shadowsocks") {
        (client as any).secret = uuid;
      } else {
        (client as any).id = uuid;
      }

      const clientData = {
        id: inboundId,
        settings: JSON.stringify({
          clients: [client]
        })
      };

      // 5. Add Client
      await axios.post(`${baseUrl}/panel/api/inbounds/addClient`, clientData, { 
        headers: { 'Cookie': cookieStr }
      });

      // 6. Construct VLESS Config Dynamically based on Inbound Settings
      // Handle External Proxy if configured in 3x-ui
      let finalDomain = domain;
      let finalPort = inboundPort;

      if (streamSettings.externalProxy && Array.isArray(streamSettings.externalProxy) && streamSettings.externalProxy.length > 0) {
        // Use the first external proxy if available
        const proxy = streamSettings.externalProxy[0];
        if (proxy.dest) finalDomain = proxy.dest;
        if (proxy.port) finalPort = proxy.port;
      } else if (streamSettings.externalProxy && typeof streamSettings.externalProxy === 'object') {
        // Some versions might use a single object
        if (streamSettings.externalProxy.dest) finalDomain = streamSettings.externalProxy.dest;
        if (streamSettings.externalProxy.port) finalPort = streamSettings.externalProxy.port;
      }

      const params = new URLSearchParams();
      params.set("type", transport);
      
      // Security Settings
      let sni = "";
      if (security === "tls") {
        params.set("security", "tls");
        sni = streamSettings.tlsSettings?.serverName || "";
        if (sni) params.set("sni", sni);
        params.set("fp", streamSettings.tlsSettings?.fingerprint || "chrome");
        if (streamSettings.tlsSettings?.alpn?.length) {
          params.set("alpn", streamSettings.tlsSettings.alpn.join(","));
        }
      } else if (security === "reality") {
        params.set("security", "reality");
        sni = streamSettings.realitySettings?.serverNames?.[0] || "";
        if (sni) params.set("sni", sni);
        params.set("fp", streamSettings.realitySettings?.fingerprint || "chrome");
        params.set("pbk", streamSettings.realitySettings?.publicKey || "");
        if (streamSettings.realitySettings?.shortIds?.[0]) {
          params.set("sid", streamSettings.realitySettings.shortIds[0]);
        }
        if (streamSettings.realitySettings?.spiderX) {
          params.set("spx", streamSettings.realitySettings.spiderX);
        }
      }

      // Transport specific settings
      let requestHost = "";
      if (transport === "grpc") {
        const grpcSettings = streamSettings.grpcSettings || {};
        params.set("serviceName", grpcSettings.serviceName || "grpc");
        if (grpcSettings.multiMode) {
          params.set("mode", "multi");
        }
        // gRPC also uses host for authority
        requestHost = grpcSettings.host || "";
      } else if (transport === "ws") {
        const wsSettings = streamSettings.wsSettings || {};
        params.set("path", wsSettings.path || "/");
        
        // Robust header extraction for "Request Header"
        const headers = wsSettings.headers || {};
        requestHost = headers.Host || headers.host || wsSettings.host || "";
      } else if (transport === "tcp") {
        const tcpSettings = streamSettings.tcpSettings || {};
        if (tcpSettings.header?.type === "http") {
          params.set("headerType", "http");
          const request = tcpSettings.header.request || {};
          const headers = request.headers || {};
          requestHost = headers.Host || headers.host || "";
          if (Array.isArray(requestHost)) requestHost = requestHost[0];
          const path = request.path || "/";
          params.set("path", Array.isArray(path) ? path[0] : path);
        }
      } else if (transport === "http") {
        const httpSettings = streamSettings.httpSettings || {};
        params.set("path", httpSettings.path || "/");
        requestHost = httpSettings.host?.join(",") || "";
      }

      // If requestHost is still empty, fallback to SNI if available
      if (!requestHost && sni) {
        requestHost = sni;
      }
      
      if (requestHost) {
        params.set("host", requestHost);
      }

      // Final Config Construction
      // Note: We use decodeURIComponent because URLSearchParams encodes characters like / and :, 
      // but some VPN clients expect them raw in the query string.
      let config = `${protocol}://${uuid}@${finalDomain}:${finalPort}?${decodeURIComponent(params.toString())}#${clientName}`;
      
      // Special handling for VMess (some clients prefer base64 JSON, but URI is also common)
      if (protocol === "vmess") {
        const vmessObj = {
          v: "2",
          ps: clientName,
          add: finalDomain,
          port: finalPort,
          id: uuid,
          aid: "0",
          scy: "auto",
          net: transport,
          type: "none",
          host: requestHost,
          path: params.get("path") || "",
          tls: security === "tls" ? "tls" : "",
          sni: sni,
          fp: params.get("fp") || ""
        };
        config = `vmess://${Buffer.from(JSON.stringify(vmessObj)).toString('base64')}`;
      } else if (protocol === "shadowsocks") {
        const method = JSON.parse(inbound.settings).method || "aes-256-gcm";
        const ssInfo = `${method}:${uuid}`;
        config = `ss://${Buffer.from(ssInfo).toString('base64')}@${finalDomain}:${finalPort}#${clientName}`;
      }
      
      return { 
        uuid, 
        config, 
        expireAt: new Date(expiryTime).toISOString(), 
        clientName 
      };
    } catch (error: any) {
      console.error("3x-ui API Error Detail:", error.response?.data || error.message);
      throw new Error(`3x-ui API Error: ${error.message}`);
    }
  };

  app.post("/api/vpn/purchase", authenticate, apiLimiter, async (req: any, res) => {
    const { userId, userEmail, server, inboundId, days, price, network, deviceCount = 1 } = req.body;
    if (req.user.uid !== userId) return res.status(403).json({ success: false, error: "Forbidden: User ID mismatch" });
    
    try {
      const user = dbLocal.prepare('SELECT balance FROM users WHERE uid = ?').get(userId) as any;
      if (!user) return res.status(404).json({ success: false, error: "User not found" });
      if (user.balance < price) return res.status(400).json({ success: false, error: "ยอดเงินคงเหลือไม่เพียงพอ (Insufficient balance)" });

      const fullServer = dbLocal.prepare('SELECT * FROM servers WHERE id = ?').get(server.id) as any;
      if (!fullServer) return res.status(404).json({ success: false, error: "Server not found" });

      const { uuid, config, expireAt, clientName } = await createVpnConfig(userEmail || 'user', fullServer, inboundId, days, network, undefined, deviceCount);
      const vpnId = uuidv4();
      const now = new Date().toISOString();

      const purchaseTx = dbLocal.transaction(() => {
        dbLocal.prepare('UPDATE users SET balance = balance - ? WHERE uid = ?').run(price, userId);
        dbLocal.prepare(`
          INSERT INTO vpns (id, userId, serverId, serverName, inboundId, uuid, config, expireAt, status, network, deviceCount, clientName, createdAt)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(vpnId, userId, fullServer.id, fullServer.name, inboundId, uuid, config, expireAt, 'active', network, deviceCount, clientName, now);
        
        dbLocal.prepare(`
          INSERT INTO transactions (id, userId, userEmail, amount, type, timestamp, note)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(uuidv4(), userId, userEmail, -price, 'purchase', now, `ซื้อ VPN ${days} วัน (${network}) - ${deviceCount} อุปกรณ์`);
      });
      purchaseTx();

      res.json({ success: true, vpnId, config });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  app.post("/api/vpn/trial", authenticate, apiLimiter, async (req: any, res) => {
    const { userId, userEmail, server, inboundId, network } = req.body;
    
    if (req.user.uid !== userId) {
      return res.status(403).json({ success: false, error: "Forbidden: User ID mismatch" });
    }
    
    try {
      const user = dbLocal.prepare('SELECT lastTrialAt FROM users WHERE uid = ?').get(userId) as any;
      if (user?.lastTrialAt) {
        const lastTrialTime = new Date(user.lastTrialAt).getTime();
        const now = new Date().getTime();
        const hoursSinceLastTrial = (now - lastTrialTime) / (1000 * 60 * 60);
        if (hoursSinceLastTrial < 24) {
          return res.status(403).json({ success: false, error: "ใช้งานทดลองฟรีไปแล้วใน 24 ชั่วโมงที่ผ่านมา" });
        }
      }

      const fullServer = dbLocal.prepare('SELECT * FROM servers WHERE id = ?').get(server.id) as any;
      if (!fullServer) return res.status(404).json({ success: false, error: "Server not found" });

      const days = 1/24; // 1 hour
      const { uuid, config, expireAt, clientName } = await createVpnConfig(userEmail || 'trial', fullServer, inboundId, days, network, 'trail');
      
      const vpnId = uuidv4();
      const now = new Date().toISOString();

      const trialTx = dbLocal.transaction(() => {
        dbLocal.prepare('UPDATE users SET hasUsedTrial = 1, lastTrialAt = ? WHERE uid = ?').run(now, userId);
        dbLocal.prepare(`
          INSERT INTO vpns (id, userId, serverId, serverName, inboundId, uuid, config, expireAt, status, network, deviceCount, clientName, isTrial, createdAt)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          vpnId, userId, fullServer.id, fullServer.name, inboundId, 
          uuid, config, expireAt, 'active', 
          network, 1, clientName, 1, now
        );

        dbLocal.prepare(`
          INSERT INTO transactions (id, userId, userEmail, amount, type, timestamp, note)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(
          uuidv4(), userId, userEmail, 0, 'trial', now, `ทดลองใช้งาน VPN ฟรี 1 ชั่วโมง (${network})`
        );
      });
      trialTx();

      res.json({ success: true, vpnId });
    } catch (error: any) {
      console.error("Trial Error:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.get("/api/my-vpns", authenticate, async (req: any, res) => {
    const vpns = dbLocal.prepare('SELECT * FROM vpns WHERE userId = ? ORDER BY createdAt DESC').all(req.user.uid);
    res.json(vpns);
  });

  app.get("/api/servers", async (req, res) => {
    try {
      // Show all servers that are NOT explicitly offline
      const servers = dbLocal.prepare("SELECT * FROM servers WHERE status != 'offline'").all();
      servers.forEach((s: any) => {
        const parseJson = (val: any, fallback: any) => {
          if (!val) return fallback;
          try {
            let parsed = typeof val === 'string' ? JSON.parse(val) : val;
            // Handle double-encoding
            if (typeof parsed === 'string') {
              parsed = JSON.parse(parsed);
            }
            return parsed;
          } catch(e) {
            return fallback;
          }
        };

        s.prices = parseJson(s.prices, {});
        s.supportedAppIcons = parseJson(s.supportedAppIcons, []);
        s.generalUsageIcons = parseJson(s.generalUsageIcons, []);
      });
      res.json(servers);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/networks", async (req, res) => {
    try {
      const networks = dbLocal.prepare("SELECT * FROM networks WHERE status IN ('active', 'open')").all();
      res.json(networks);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/device-options", async (req, res) => {
    const list = dbLocal.prepare('SELECT * FROM device_options WHERE status = 1 ORDER BY sortOrder ASC').all();
    res.json(list);
  });

  app.get("/api/my-tickets", authenticate, async (req: any, res) => {
    const tickets = dbLocal.prepare('SELECT * FROM tickets WHERE userId = ? ORDER BY updatedAt DESC').all(req.user.uid);
    res.json(tickets);
  });

  app.get("/api/payment-methods", async (req, res) => {
    res.json(getSetting('payment_methods', { promptpay: 'open', truemoney: 'open' }));
  });

  // --- User Profile API ---
  app.get("/api/me", authenticate, async (req: any, res) => {
    try {
      let user = dbLocal.prepare('SELECT * FROM users WHERE uid = ?').get(req.user.uid) as any;
      
      // Auto-create user in SQLite if not exists but authenticated in Firebase
      if (!user) {
        const isAdmin = (req.user.email === 'jry.fook@gmail.com');
        const now = new Date().toISOString();
        dbLocal.prepare(`
          INSERT INTO users (uid, email, balance, role, createdAt)
          VALUES (?, ?, ?, ?, ?)
        `).run(req.user.uid, req.user.email || 'Unknown', 0, isAdmin ? 'admin' : 'user', now);
        
        user = dbLocal.prepare('SELECT * FROM users WHERE uid = ?').get(req.user.uid);
      }
      
      res.json(user);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/settings/global", async (req, res) => {
    res.json(getSetting('global', { discordInvite: '', news: '' }));
  });

  app.get("/api/settings/app_icons", async (req, res) => {
    res.json(getSetting('app_icons', {}));
  });

  app.get("/api/settings/payment", async (req, res) => {
    res.json(getSetting('payment', { trueMoneyNumber: '', paymentQrUrl: '' }));
  });

  app.get("/api/my-transactions", authenticate, async (req: any, res) => {
    const txs = dbLocal.prepare('SELECT * FROM transactions WHERE userId = ? ORDER BY timestamp DESC LIMIT 10').all(req.user.uid);
    res.json(txs);
  });

  app.get("/api/my-manual-topups", authenticate, async (req: any, res) => {
    const list = dbLocal.prepare('SELECT * FROM manual_topups WHERE userId = ? ORDER BY createdAt DESC LIMIT 5').all(req.user.uid);
    res.json(list);
  });

  // Topup Verification
  app.post("/api/topup/verify", authenticate, topupLimiter, async (req: any, res) => {
    const { userId, type, data } = req.body;
    if (req.user.uid !== userId) return res.status(403).json({ success: false, error: "Forbidden: User ID mismatch" });
    
    try {
      const methods = getSetting('payment_methods', { truemoney: 'open', promptpay: 'open' });
      const methodKey = type === 'gift' ? 'truemoney' : 'promptpay';
      const status = methods[methodKey] || 'open';

      if (status === 'closed' || status === false) {
        return res.status(403).json({ success: false, error: "ช่องทางการชำระเงินนี้ถูกปิดใช้งานชั่วคราว" });
      }

      if (status === 'maintenance') {
        const user: any = dbLocal.prepare('SELECT role FROM users WHERE uid = ?').get(req.user.uid);
        if (user?.role !== 'admin' && req.user.email !== 'jry.fook@gmail.com') {
           return res.status(403).json({ success: false, error: "ช่องทางการชำระเงินนี้กำลังปิดปรับปรุง (เฉพาะแอดมิน)" });
        }
      }

      if (type === 'transfer') {
        const paymentSettings = getSetting('payment', { minTopup: 50 });
        const keys = getSetting('payment_keys', {});
        const slipProvider = keys.slipProvider || 'easyslip';

        if (!data) return res.status(400).json({ success: false, error: "กรุณาอัปโหลดสลิป" });
        const base64Image = data.replace(/^data:image\/\w+;base64,/, "");

        let amount = 0;
        let transRef = "";

        if (slipProvider === 'easyslip') {
          const apiKey = keys.easySlipApiKey || process.env.EASY_SLIP_API_KEY;
          if (!apiKey) return res.status(400).json({ success: false, error: "ระบบยังไม่ได้ตั้งค่า API Key สำหรับ EasySlip" });
          
          const verifyRes = await axios.post('https://developer.easyslip.com/api/v1/verify', { image: base64Image }, {
            headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' }
          });

          if (verifyRes.data.status === 200 || verifyRes.data.data) {
            const slipData = verifyRes.data.data;
            amount = slipData.amount?.amount || slipData.amount;
            transRef = slipData.transRef;
          } else {
             return res.status(400).json({ success: false, error: "ไม่สามารถตรวจสอบสลิปได้ (EasySlip)" });
          }
        } else if (slipProvider === 'rdcw') {
           const clientId = keys.rdcwClientId;
           const clientSecret = keys.rdcwClientSecret;
           
           if (!clientId || !clientSecret) return res.status(400).json({ success: false, error: "ระบบยังไม่ได้ตั้งค่า Client ID / Secret สำหรับ RDCW" });
           
           try {
             const imageBuffer = Buffer.from(base64Image, 'base64');
             const authHeader = `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`;

             const verifyRes = await axios.post('https://suba.rdcw.co.th/v2/inquiry', imageBuffer, {
               headers: { 
                 'Authorization': authHeader, 
                 'Content-Type': 'image/jpeg' 
               }
             });
             
             const result = verifyRes.data;
             const resData = result.data || result.payload || result;
             
             if (resData && (resData.amount !== undefined || resData.transRef !== undefined)) {
               amount = resData.amount?.amount || resData.amount;
               transRef = resData.transRef || resData.transactionId || resData.ref1;
             } else {
               throw new Error("รูปแบบสลิปไม่ถูกต้อง หรือเอกสาร API เปลี่ยนแปลง");
             }
           } catch (error: any) {
             console.error("RDCW Check Error:", error?.response?.data || error);
             let errorMsg = "ไม่สามารถตรวจสอบสลิปได้ (RDCW)";
             if (error?.response?.data?.message) {
               errorMsg = `${errorMsg}: ${error.response.data.message}`;
             } else if (error?.response?.data?.code) {
               errorMsg = `${errorMsg} - Error Code: ${error.response.data.code}`;
             }
             return res.status(400).json({ success: false, error: errorMsg });
           }
        }

        if (amount < (paymentSettings.minTopup || 50)) {
          return res.status(400).json({ success: false, error: `จำนวนเงินขั้นต่ำ ${paymentSettings.minTopup || 50} บาท` });
        }

        const topupTx = dbLocal.transaction(() => {
          const used = dbLocal.prepare('SELECT id FROM used_slips WHERE id = ?').get(transRef);
          if (used) throw new Error("สลิปนี้ถูกใช้งานไปแล้ว");

          dbLocal.prepare('INSERT INTO used_slips (id, userId, amount, timestamp) VALUES (?, ?, ?, ?)').run(transRef, userId, amount, new Date().toISOString());
          dbLocal.prepare('UPDATE users SET balance = balance + ? WHERE uid = ?').run(amount, userId);
          dbLocal.prepare(`
            INSERT INTO transactions (id, userId, userEmail, amount, type, timestamp, note)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `).run(uuidv4(), userId, req.user.email, amount, 'topup', new Date().toISOString(), `เติมเงินผ่าน PromptPay (${slipProvider}) (Ref: ${transRef})`);
          
          return (dbLocal.prepare('SELECT balance FROM users WHERE uid = ?').get(userId) as any).balance;
        });

        const newBalance = topupTx();
        return res.json({ success: true, amount, balance: newBalance });
        
      } else if (type === 'gift') {
        const paymentSettings = getSetting('payment', {});
        const mobile = paymentSettings.trueMoneyNumber?.replace(/[^0-9]/g, '');
        if (!mobile) return res.status(400).json({ success: false, error: "ระบบยังไม่ได้ตั้งค่าเบอร์โทรศัพท์สำหรับรับอั่งเปา" });

        const darkxApiKey = (getSetting('payment_keys', {})).darkxApiKey || process.env.DARKX_API_KEY;
        if (!darkxApiKey) return res.status(400).json({ success: false, error: "ระบบยังไม่ได้ตั้งค่า API Key" });

        const redeemRes = await axios.get(`https://api.darkx.shop/tools/truemoney`, {
          params: { code: data, phone: mobile },
          headers: { 'Accept': 'application/json', 'x-api-key': darkxApiKey }
        });
        
        if (redeemRes.data.status === true) {
          const amount = parseFloat(redeemRes.data.amount);
          const topupTx = dbLocal.transaction(() => {
            dbLocal.prepare('UPDATE users SET balance = balance + ? WHERE uid = ?').run(amount, userId);
            dbLocal.prepare(`
              INSERT INTO transactions (id, userId, userEmail, amount, type, timestamp, note)
              VALUES (?, ?, ?, ?, ?, ?, ?)
            `).run(uuidv4(), userId, req.user.email, amount, 'topup', new Date().toISOString(), `เติมเงินผ่าน อั่งเปา TrueMoney`);
            return (dbLocal.prepare('SELECT balance FROM users WHERE uid = ?').get(userId) as any).balance;
          });
          const newBalance = topupTx();
          return res.json({ success: true, amount, balance: newBalance });
        } else {
          return res.status(400).json({ success: false, error: redeemRes.data.msg || "ไม่สามารถรับซองอั่งเปาได้" });
        }
      }

      res.status(400).json({ success: false, error: "ข้อมูลไม่ถูกต้อง" });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message });
    }
  });

  // --- TICKETS API ---
  app.post("/api/tickets/create", authenticate, apiLimiter, async (req: any, res) => {
    try {
      const { title, initialMessage } = req.body;
      const userId = req.user.uid;
      const userEmail = req.user.email;

      if (!title) return res.status(400).json({ error: "กรุณาระบุหัวข้อปัญหา" });

      const openTicket = dbLocal.prepare("SELECT id FROM tickets WHERE userId = ? AND status != 'closed'").get(userId);
      if (openTicket) {
        return res.status(400).json({ 
          error: "คุณมี Ticket ที่ยังเปิดค้างอยู่ 1 รายการ กรุณารอให้แอดมินปิดงานเดิมก่อนจึงจะเปิดใหม่ได้" 
        });
      }

      const ticketId = uuidv4();
      const now = new Date().toISOString();

      const ticketTx = dbLocal.transaction(() => {
        dbLocal.prepare(`
          INSERT INTO tickets (id, userId, userEmail, subject, status, createdAt, updatedAt)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(ticketId, userId, userEmail, title, 'open', now, now);

        if (initialMessage) {
          dbLocal.prepare(`
            INSERT INTO ticket_messages (id, ticketId, userId, userEmail, content, role, timestamp)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `).run(uuidv4(), ticketId, userId, userEmail, initialMessage, 'user', now);
        }
      });
      ticketTx();

      sendDiscordNotification(`🆕 **Ticket ใหม่!**\n**ID:** \`${ticketId}\`\n**หัวข้อ:** ${title}\n**จากผู้ใช้:** ${userEmail} (${userId})`);
      return res.json({ success: true, ticketId });
    } catch (error: any) {
      console.error("Create ticket error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/tickets/:ticketId", authenticate, async (req: any, res) => {
    try {
      const { ticketId } = req.params;
      const ticket: any = dbLocal.prepare('SELECT * FROM tickets WHERE id = ?').get(ticketId);
      if (!ticket) return res.status(404).json({ error: "ไม่พบ Ticket" });
      
      const user: any = dbLocal.prepare('SELECT role FROM users WHERE uid = ?').get(req.user.uid);
      if (ticket.userId !== req.user.uid && user?.role !== 'admin' && req.user.email !== 'jry.fook@gmail.com') {
        return res.status(403).json({ error: "ไม่มีสิทธิ์เข้าถึง Ticket นี้" });
      }

      const messages = dbLocal.prepare('SELECT * FROM ticket_messages WHERE ticketId = ? ORDER BY timestamp ASC').all(ticketId);
      res.json({ ticket, messages });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/tickets/:ticketId/messages", authenticate, async (req: any, res) => {
    const messages = dbLocal.prepare('SELECT * FROM ticket_messages WHERE ticketId = ? ORDER BY timestamp ASC').all(req.params.ticketId);
    res.json(messages);
  });

  const replyLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, 
    max: 30,
    message: { error: "Too many messages, please wait a moment" },
  });

  app.post("/api/tickets/:ticketId/reply", authenticate, replyLimiter, async (req: any, res) => {
    try {
      const { ticketId } = req.params;
      const { content, role } = req.body;
      const userId = req.user.uid;
      
      const ticket: any = dbLocal.prepare('SELECT * FROM tickets WHERE id = ?').get(ticketId);
      if (!ticket) return res.status(404).json({ error: "ไม่พบ Ticket" });
      
      const user: any = dbLocal.prepare('SELECT role FROM users WHERE uid = ?').get(userId);
      const isOwner = ticket.userId === userId;
      const isAdminReply = (user?.role === 'admin' || req.user.email === 'jry.fook@gmail.com');
      
      if (!isOwner && !isAdminReply) return res.status(403).json({ error: "ไม่มีสิทธิ์ตอบกลับ Ticket นี้" });

      const now = new Date().toISOString();
      const replyTx = dbLocal.transaction(() => {
        dbLocal.prepare(`
          INSERT INTO ticket_messages (id, ticketId, userId, userEmail, content, role, timestamp)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(uuidv4(), ticketId, userId, req.user.email, content || '', role, now);

        dbLocal.prepare('UPDATE tickets SET status = ?, updatedAt = ? WHERE id = ?')
          .run(isAdminReply ? 'answered' : 'waiting', now, ticketId);
      });
      replyTx();

      return res.json({ success: true });
    } catch (error: any) {
      console.error("Reply ticket error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/tickets/:ticketId/close", authenticate, async (req: any, res) => {
    try {
      const { ticketId } = req.params;
      const userId = req.user.uid;

      const ticket: any = dbLocal.prepare('SELECT * FROM tickets WHERE id = ?').get(ticketId);
      if (!ticket) return res.status(404).json({ error: "ไม่พบ Ticket" });
      
      const user: any = dbLocal.prepare('SELECT role FROM users WHERE uid = ?').get(userId);
      const isOwner = ticket.userId === userId;
      const isAdminUser = (user?.role === 'admin' || req.user.email === 'jry.fook@gmail.com');
      
      if (!isOwner && !isAdminUser) return res.status(403).json({ error: "ไม่มีสิทธิ์ปิด Ticket นี้" });

      dbLocal.prepare("UPDATE tickets SET status = 'closed', updatedAt = ? WHERE id = ?").run(new Date().toISOString(), ticketId);

      sendDiscordNotification(`✅ **Ticket ปิดงานแล้ว!**\n**ID:** \`${ticketId}\`\n**หัวข้อ:** ${ticket.subject}\n**ผู้ปิดงาน:** ${isAdminUser ? 'แอดมิน' : 'ลูกค้า'} (${req.user.email || 'Unknown'})`);
      return res.json({ success: true });
    } catch (error: any) {
      console.error("Close ticket error:", error);
      res.status(500).json({ error: error.message });
    }
  });
  // --- END TICKETS API ---

  // Manual Topup Submission
  app.post("/api/topup/manual", authenticate, topupLimiter, async (req: any, res) => {
    const { userId, amount, imageBase64 } = req.body;
    
    if (req.user.uid !== userId) {
      return res.status(403).json({ success: false, error: "Forbidden: User ID mismatch" });
    }

    if (!amount || isNaN(amount) || amount <= 0) {
      return res.status(400).json({ success: false, error: "จำนวนเงินไม่ถูกต้อง" });
    }

    if (!imageBase64 || !imageBase64.includes('base64,')) {
      return res.status(400).json({ success: false, error: "กรุณาอัปโหลดรูปภาพสลิปที่ถูกต้อง" });
    }

    try {
      const pendingCountObj = dbLocal.prepare("SELECT count(*) as count FROM manual_topups WHERE userId = ? AND status = 'pending'").get(userId) as any;
      if (pendingCountObj.count >= 3) {
        return res.status(400).json({ success: false, error: "คุณมีรายการรอตรวจสอบมากเกินไป กรุณารอแอดมินดำเนินการ" });
      }

      const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
      const imageHash = crypto.createHash('sha256').update(base64Data).digest('hex');

      const existing = dbLocal.prepare('SELECT id FROM manual_topups WHERE slipHash = ?').get(imageHash);
      if (existing) {
        return res.status(400).json({ success: false, error: "สลิปนี้ถูกใช้งานไปแล้วในระบบ กรุณาใช้สลิปอื่น" });
      }

      dbLocal.prepare(`
        INSERT INTO manual_topups (id, userId, userEmail, amount, slipHash, status, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(uuidv4(), userId, req.user.email, Number(amount), imageHash, 'pending', new Date().toISOString());

      return res.json({ success: true });
    } catch (error: any) {
      console.error("Manual topup error:", error);
      return res.status(500).json({ success: false, error: "เกิดข้อผิดพลาดในการส่งข้อมูล" });
    }
  });

  // Admin Topup Actions
  app.post("/api/admin/topup/manual/approve", authenticate, adminOnly, async (req: any, res) => {
    const { id, amount } = req.body;
    if (!id || !amount || isNaN(amount) || amount <= 0) return res.status(400).json({ success: false, error: "ข้อมูลไม่ถูกต้อง" });

    try {
      const topup: any = dbLocal.prepare('SELECT * FROM manual_topups WHERE id = ?').get(id);
      if (!topup) return res.status(404).json({ error: "ไม่พบรายการ" });
      if (topup.status !== 'pending') return res.status(400).json({ error: `รายการนี้ถูกดำเนินการไปแล้ว (สถานะ: ${topup.status})` });

      const topupTx = dbLocal.transaction(() => {
        dbLocal.prepare("UPDATE manual_topups SET status = 'approved', amount = ? WHERE id = ?").run(Number(amount), id);
        dbLocal.prepare('UPDATE users SET balance = balance + ? WHERE uid = ?').run(Number(amount), topup.userId);
        dbLocal.prepare(`
          INSERT INTO transactions (id, userId, userEmail, amount, type, timestamp, note)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(uuidv4(), topup.userId, topup.userEmail, Number(amount), 'topup_manual', new Date().toISOString(), `เติมเงินผ่านแอดมิน (อนุมัติสลิป)`);
      });
      topupTx();
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  app.post("/api/admin/topup/manual/reject", authenticate, adminOnly, async (req: any, res) => {
    const { id, reason } = req.body;
    if (!id || !reason) return res.status(400).json({ success: false, error: "กรุณาระบุเหตุผล" });

    try {
      dbLocal.prepare("UPDATE manual_topups SET status = 'rejected' WHERE id = ?").run(id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  // Reset Ad Claim (Admin Only)
  app.post("/api/admin/users/:userId/reset-ad-claim", authenticate, adminOnly, async (req: any, res) => {
    const { userId } = req.params;
    try {
      dbLocal.prepare('UPDATE users SET lastAdClaimAt = NULL WHERE uid = ?').run(userId);
      dbLocal.prepare('DELETE FROM linkvertise_claims WHERE userId = ?').run(userId);
      res.json({ success: true, message: "Reset ad claim cooldown successfully" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Delete User (Admin Only)
  app.delete("/api/admin/users/:userId", authenticate, adminOnly, async (req: any, res) => {
    const { userId } = req.params;
    try {
      let authDeleted = true;
      try {
        await getAdminAuth(adminApp).deleteUser(userId);
      } catch (authError: any) {
        console.error("Auth deletion failed:", authError.message);
        authDeleted = false;
      }
      dbLocal.prepare('DELETE FROM users WHERE uid = ?').run(userId);
      
      if (!authDeleted) {
        return res.json({ 
          success: true, 
          warning: "ลบข้อมูลผู้ใช้จากฐานข้อมูลสำเร็จ แต่ไม่สามารถลบบัญชี Auth ได้ (Identity Toolkit API อาจถูกปิดใช้งาน)" 
        });
      }
      
      res.json({ success: true });
    } catch (error: any) {
      console.error("Failed to delete user:", error);
      res.status(500).json({ error: "ไม่สามารถลบผู้ใช้ได้", details: error.message });
    }
  });

  // Update User (Admin Only)
  app.put("/api/admin/users/:userId", authenticate, adminOnly, async (req: any, res) => {
    const { userId } = req.params;
    const data = req.body;
    try {
      if (data.role !== undefined) {
        dbLocal.prepare('UPDATE users SET role = ? WHERE uid = ?').run(data.role, userId);
      }
      if (data.status !== undefined) {
        dbLocal.prepare('UPDATE users SET status = ? WHERE uid = ?').run(data.status, userId);
      }
      if (data.hasUsedTrial !== undefined) {
        dbLocal.prepare('UPDATE users SET hasUsedTrial = ?, lastTrialAt = ? WHERE uid = ?').run(
          data.hasUsedTrial ? 1 : 0, 
          data.lastTrialAt !== undefined ? data.lastTrialAt : null, 
          userId
        );
      }
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Add Balance (Admin Only)
  app.post("/api/admin/users/:userId/balance", authenticate, adminOnly, async (req: any, res) => {
    const { userId } = req.params;
    const { amount } = req.body;
    try {
      const dbTx = dbLocal.transaction(() => {
        dbLocal.prepare('UPDATE users SET balance = balance + ? WHERE uid = ?').run(amount, userId);
        dbLocal.prepare(`
          INSERT INTO transactions (id, userId, amount, type, timestamp, note) 
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(
          crypto.randomUUID(),
          userId,
          amount,
          'topup',
          new Date().toISOString(),
          `แอดมินปรับยอดเงินด้วยตนเอง (${amount > 0 ? '+' : ''}${amount})`
        );
      });
      dbTx();
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get User VPNs (Admin Only)
  app.get("/api/admin/users/:userId/vpns", authenticate, adminOnly, async (req: any, res) => {
    const { userId } = req.params;
    try {
      const vpns = dbLocal.prepare('SELECT * FROM vpns WHERE userId = ?').all(userId);
      res.json(vpns);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Delete VPN (Admin Only)
  app.delete("/api/admin/vpns/:vpnId", authenticate, adminOnly, async (req: any, res) => {
    const { vpnId } = req.params;
    try {
      dbLocal.prepare('DELETE FROM vpns WHERE id = ?').run(vpnId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get All Networks (Admin)
  app.get("/api/admin/networks", authenticate, adminOnly, async (req: any, res) => {
    try {
      const list = dbLocal.prepare('SELECT * FROM networks').all();
      res.json(list);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/admin/networks", authenticate, adminOnly, async (req: any, res) => {
    const data = req.body;
    try {
      const id = typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : Math.random().toString(36).substring(7);
      
      // Update SQLite
      dbLocal.prepare(`
        INSERT INTO networks (id, name, inboundId, color, status)
        VALUES (?, ?, ?, ?, ?)
      `).run(id, data.name, data.inboundId, data.color || 'blue', data.status || 'open');

      // Sync to Firestore
      await setDoc(doc(dbModular, 'networks', id), {
        name: data.name,
        inboundId: data.inboundId,
        color: data.color || 'blue',
        status: data.status || 'open',
        updatedAt: serverTimestamp()
      });

      res.json({ success: true, id });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/admin/networks/:id", authenticate, adminOnly, async (req: any, res) => {
    const { id } = req.params;
    const data = req.body;
    try {
      // Update SQLite
      dbLocal.prepare(`
        UPDATE networks SET name = ?, inboundId = ?, color = ?, status = ? WHERE id = ?
      `).run(data.name, data.inboundId, data.color, data.status, id);

      // Sync to Firestore
      await setDoc(doc(dbModular, 'networks', id), {
        name: data.name,
        inboundId: data.inboundId,
        color: data.color,
        status: data.status,
        updatedAt: serverTimestamp()
      }, { merge: true });

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/admin/networks/:id", authenticate, adminOnly, async (req: any, res) => {
    const { id } = req.params;
    try {
      dbLocal.prepare('DELETE FROM networks WHERE id = ?').run(id);
      await deleteDoc(doc(dbModular, 'networks', id));
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get All Servers (Admin)
  app.get("/api/admin/servers", authenticate, adminOnly, async (req: any, res) => {
    try {
      const list = dbLocal.prepare('SELECT * FROM servers').all();
      const now = new Date().toISOString();
      // Parse prices
      list.forEach((s: any) => {
        // Calculate dynamic current users from vpns table
        const activeUsersCount = dbLocal.prepare('SELECT COUNT(*) as count FROM vpns WHERE serverId = ? AND expireAt > ?').get(s.id, now) as { count: number };
        s.currentUsers = activeUsersCount.count || 0;
        
        try {
          s.prices = JSON.parse(s.prices);
        } catch(e) {
          s.prices = {};
        }
      });
      res.json(list);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/admin/servers", authenticate, adminOnly, async (req: any, res) => {
    const data = req.body;
    try {
      const id = typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : Math.random().toString(36).substring(7);
      
      const serverData = {
        name: data.name,
        host: data.host,
        port: data.port,
        username: data.username,
        password: data.password,
        prices: typeof data.prices === 'string' ? data.prices : JSON.stringify(data.prices || {}),
        status: data.status || 'online',
        maxUsers: data.maxUsers || 100,
        description: data.description || '',
        supportedAppIcons: typeof data.supportedAppIcons === 'string' ? data.supportedAppIcons : JSON.stringify(data.supportedAppIcons || []),
        generalUsageIcons: typeof data.generalUsageIcons === 'string' ? data.generalUsageIcons : JSON.stringify(data.generalUsageIcons || [])
      };

      // Update SQLite
      dbLocal.prepare(`
        INSERT INTO servers (id, name, host, port, username, password, prices, status, maxUsers, currentUsers, description, supportedAppIcons, generalUsageIcons)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id, serverData.name, serverData.host, serverData.port, serverData.username, serverData.password, 
        serverData.prices, serverData.status, serverData.maxUsers, 0, 
        serverData.description, serverData.supportedAppIcons, serverData.generalUsageIcons
      );

      // Sync to Firestore
      await setDoc(doc(dbModular, 'servers', id), {
        ...serverData,
        prices: typeof data.prices === 'string' ? JSON.parse(data.prices) : (data.prices || {}),
        supportedAppIcons: typeof data.supportedAppIcons === 'string' ? JSON.parse(data.supportedAppIcons) : (data.supportedAppIcons || []),
        generalUsageIcons: typeof data.generalUsageIcons === 'string' ? JSON.parse(data.generalUsageIcons) : (data.generalUsageIcons || []),
        updatedAt: serverTimestamp()
      });

      res.json({ success: true, id });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/admin/servers/:id", authenticate, adminOnly, async (req: any, res) => {
    const { id } = req.params;
    const data = req.body;
    try {
      const serverData = {
        name: data.name,
        host: data.host,
        port: data.port,
        username: data.username,
        password: data.password,
        prices: typeof data.prices === 'string' ? data.prices : JSON.stringify(data.prices || {}),
        status: data.status,
        maxUsers: data.maxUsers || 100,
        description: data.description || '',
        supportedAppIcons: typeof data.supportedAppIcons === 'string' ? data.supportedAppIcons : JSON.stringify(data.supportedAppIcons || []),
        generalUsageIcons: typeof data.generalUsageIcons === 'string' ? data.generalUsageIcons : JSON.stringify(data.generalUsageIcons || [])
      };

      // Update SQLite
      dbLocal.prepare(`
        UPDATE servers SET name = ?, host = ?, port = ?, username = ?, password = ?, prices = ?, status = ?, maxUsers = ?, description = ?, supportedAppIcons = ?, generalUsageIcons = ? WHERE id = ?
      `).run(
        serverData.name, serverData.host, serverData.port, serverData.username, serverData.password, 
        serverData.prices, serverData.status, serverData.maxUsers, 
        serverData.description, serverData.supportedAppIcons, serverData.generalUsageIcons, id
      );

      // Sync to Firestore
      await setDoc(doc(dbModular, 'servers', id), {
        ...serverData,
        prices: typeof data.prices === 'string' ? JSON.parse(data.prices) : (data.prices || {}),
        supportedAppIcons: typeof data.supportedAppIcons === 'string' ? JSON.parse(data.supportedAppIcons) : (data.supportedAppIcons || []),
        generalUsageIcons: typeof data.generalUsageIcons === 'string' ? JSON.parse(data.generalUsageIcons) : (data.generalUsageIcons || []),
        updatedAt: serverTimestamp()
      }, { merge: true });

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/admin/servers/:id", authenticate, adminOnly, async (req: any, res) => {
    const { id } = req.params;
    try {
      dbLocal.prepare('DELETE FROM servers WHERE id = ?').run(id);
      await deleteDoc(doc(dbModular, 'servers', id));
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get All Devices (Admin)
  app.get("/api/admin/device-options", authenticate, adminOnly, async (req: any, res) => {
    try {
      const list = dbLocal.prepare('SELECT * FROM device_options ORDER BY sortOrder ASC, count ASC').all();
      // Map back to status boolean
      res.json(list.map((d: any) => ({ ...d, status: d.status === 1 })));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/admin/device-options", authenticate, adminOnly, async (req: any, res) => {
    const data = req.body;
    try {
      const id = typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : Math.random().toString(36).substring(7);
      
      // Update SQLite
      dbLocal.prepare(`
        INSERT INTO device_options (id, name, count, price, sortOrder, status)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(id, data.name, data.count, data.price, data.sortOrder || 0, data.status ? 1 : 0);

      // Sync to Firestore
      await setDoc(doc(dbModular, 'device_options', id), {
        name: data.name,
        count: Number(data.count),
        price: Number(data.price),
        sortOrder: Number(data.sortOrder || 0),
        status: data.status ? true : false,
        updatedAt: serverTimestamp()
      });

      res.json({ success: true, id });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/admin/device-options/:id", authenticate, adminOnly, async (req: any, res) => {
    const { id } = req.params;
    const data = req.body;
    try {
      // Update SQLite
      dbLocal.prepare(`
        UPDATE device_options SET name = ?, count = ?, price = ?, sortOrder = ?, status = ? WHERE id = ?
      `).run(data.name, data.count, data.price, data.sortOrder || 0, data.status ? 1 : 0, id);

      // Sync to Firestore
      await setDoc(doc(dbModular, 'device_options', id), {
        name: data.name,
        count: Number(data.count),
        price: Number(data.price),
        sortOrder: Number(data.sortOrder || 0),
        status: data.status ? true : false,
        updatedAt: serverTimestamp()
      }, { merge: true });

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/admin/device-options/:id", authenticate, adminOnly, async (req: any, res) => {
    const { id } = req.params;
    try {
      dbLocal.prepare('DELETE FROM device_options WHERE id = ?').run(id);
      await deleteDoc(doc(dbModular, 'device_options', id));
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // --- Client Protected API Routes ---
  app.get("/api/admin/stats", authenticate, adminOnly, async (req, res) => {
    const now = new Date().toISOString();
    const totalUsers = (dbLocal.prepare('SELECT count(*) as count FROM users').get() as any).count;
    const totalVpns = (dbLocal.prepare('SELECT count(*) as count FROM vpns WHERE expireAt > ?').get(now) as any).count;
    const totalTransactions = (dbLocal.prepare('SELECT sum(amount) as sum FROM transactions').get() as any).sum || 0;
    const totalServers = (dbLocal.prepare('SELECT count(*) as count FROM servers').get() as any).count;
    const onlineServers = (dbLocal.prepare("SELECT count(*) as count FROM servers WHERE status != 'offline'").get() as any).count;
    
    // Get server stats
    const serversList = dbLocal.prepare('SELECT id, name, maxUsers FROM servers').all() as any[];
    const serversStats = serversList.map(s => {
      const activeUsersCount = dbLocal.prepare('SELECT COUNT(*) as count FROM vpns WHERE serverId = ? AND expireAt > ?').get(s.id, now) as { count: number };
      return {
        id: s.id,
        name: s.name,
        currentUsers: activeUsersCount.count || 0,
        maxUsers: s.maxUsers || null
      };
    });

    res.json({ totalUsers, totalVpns, totalTransactions, totalServers, onlineServers, serversStats });
  });

  app.get("/api/admin/users", authenticate, adminOnly, async (req, res) => {
    const list = dbLocal.prepare('SELECT * FROM users ORDER BY createdAt DESC').all();
    res.json(list);
  });

  app.get("/api/admin/vpns", authenticate, adminOnly, async (req, res) => {
    const list = dbLocal.prepare('SELECT * FROM vpns ORDER BY createdAt DESC LIMIT 100').all();
    res.json(list);
  });

  app.get("/api/admin/transactions", authenticate, adminOnly, async (req, res) => {
    const list = dbLocal.prepare('SELECT * FROM transactions ORDER BY timestamp DESC LIMIT 100').all();
    res.json(list);
  });

  app.get("/api/admin/tickets", authenticate, adminOnly, async (req, res) => {
    const list = dbLocal.prepare('SELECT * FROM tickets ORDER BY updatedAt DESC').all();
    res.json(list);
  });

  app.get("/api/admin/tickets/pending", authenticate, adminOnly, async (req, res) => {
    const list = dbLocal.prepare("SELECT * FROM tickets WHERE status IN ('open', 'waiting') ORDER BY updatedAt DESC").all();
    res.json(list);
  });

  app.get("/api/admin/topup/manual/pending", authenticate, adminOnly, async (req, res) => {
    const list = dbLocal.prepare("SELECT * FROM manual_topups WHERE status = 'pending' ORDER BY createdAt DESC").all();
    res.json(list);
  });

  app.get("/api/debug-sync", authenticate, adminOnly, async (req, res) => {
    try {
      await syncFirestoreToLocal();
      const users = (dbLocal.prepare('SELECT count(*) as count FROM users').get() as any).count;
      const servers = (dbLocal.prepare('SELECT count(*) as count FROM servers').get() as any).count;
      res.json({ success: true, users, servers });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/admin/settings", authenticate, adminOnly, async (req, res) => {
    const rows = dbLocal.prepare('SELECT * FROM settings').all();
    const settings: any = {};
    rows.forEach((row: any) => {
      settings[row.id] = JSON.parse(row.data);
    });
    res.json(settings);
  });

  app.post("/api/admin/settings/:id", authenticate, adminOnly, async (req, res) => {
    const { id } = req.params;
    const data = req.body;
    dbLocal.prepare('INSERT OR REPLACE INTO settings (id, data) VALUES (?, ?)').run(id, JSON.stringify(data));
    res.json({ success: true });
  });

  // --- Linkvertise Ad Config API ---
  app.post("/api/linkvertise/init", authenticate, apiLimiter, async (req: any, res) => {
    try {
      const userId = req.user.uid;
      const ip = req.headers['x-forwarded-for']?.toString().split(',')[0] || req.socket.remoteAddress || 'unknown';
      const { serverId, network } = req.body;

      if (!serverId || !network) return res.status(400).json({ error: "ข้อมูลไม่ครบถ้วน (ต้องการ serverId, network)" });

      const user: any = dbLocal.prepare('SELECT lastAdClaimAt, role FROM users WHERE uid = ?').get(userId);
      const isAdmin = user?.role === 'admin' || req.user.email === 'jry.fook@gmail.com';

      if (user?.lastAdClaimAt && !isAdmin) {
        const hoursSince = (Date.now() - new Date(user.lastAdClaimAt).getTime()) / (1000 * 60 * 60);
        if (hoursSince < 6) {
          return res.status(400).json({ error: `คุณเพิ่งรับสิทธิ์ไป กรุณารออีก ${(6 - hoursSince).toFixed(1)} ชั่วโมง` });
        }
      }

      // 2. Check IP Cooldown (6 hours limit) - Skip if IP is unknown or user is Admin
      if (ip !== 'unknown' && !isAdmin) {
        const lastClaim: any = dbLocal.prepare('SELECT claimTime FROM linkvertise_claims WHERE ipAddress = ? ORDER BY claimTime DESC LIMIT 1').get(ip);
        if (lastClaim) {
          const hoursSince = (Date.now() - new Date(lastClaim.claimTime).getTime()) / (1000 * 60 * 60);
          if (hoursSince < 6) {
             return res.status(400).json({ error: `เครือข่าย/IP นี้เพิ่งรับสิทธิ์ไป กรุณารออีก ${(6 - hoursSince).toFixed(1)} ชั่วโมง` });
          }
        }
      }

      const settings = getSetting('global');
      if (!settings.linkvertiseEnabled) return res.status(403).json({ error: "ระบบดูโฆษณาปิดปรับปรุงชั่วคราว" });
      if (!settings.linkvertiseUrl) return res.status(400).json({ error: "แอดมินยังไม่ได้ตั้งค่าลิงก์ Linkvertise" });

      const token = crypto.randomBytes(16).toString('hex');
      dbLocal.prepare(`
        INSERT INTO linkvertise_sessions (id, userId, userEmail, ipAddress, serverId, network, status, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(token, userId, req.user.email || 'unknown', ip, serverId, network, 'pending', new Date().toISOString());

      res.json({ success: true, token, targetUrl: settings.linkvertiseUrl });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/linkvertise/claim", authenticate, apiLimiter, async (req: any, res) => {
    try {
      const { token } = req.body;
      const userId = req.user.uid;
      const ip = req.headers['x-forwarded-for']?.toString().split(',')[0] || req.socket.remoteAddress || 'unknown';

      const session: any = dbLocal.prepare('SELECT * FROM linkvertise_sessions WHERE id = ?').get(token);
      if (!session || session.status !== 'pending') {
        return res.status(400).json({ error: "Session ยืนยันไม่ถูกต้องหรือถูกใช้งานไปแล้ว" });
      }

      if (session.userId !== userId) return res.status(403).json({ error: "สิทธิ์นี้เป็นของบัญชีผู้ใช้อื่น" });

      const server: any = dbLocal.prepare('SELECT * FROM servers WHERE id = ?').get(session.serverId);
      const network: any = dbLocal.prepare('SELECT * FROM networks WHERE name = ?').get(session.network);
      if (!server || !network) return res.status(404).json({ error: "ข้อมูลเซิร์ฟเวอร์หรือเครือข่ายไม่ถูกต้อง" });

      const days = 0.25; // 6 hours
      const vpnResult = await createVpnConfig(req.user.email || 'ad_user', server, network.inboundId, days, session.network, 'ad');
      
      const claimTx = dbLocal.transaction(() => {
        dbLocal.prepare("UPDATE linkvertise_sessions SET status = 'claimed' WHERE id = ?").run(token);
        dbLocal.prepare(`
          INSERT INTO vpns (id, userId, serverId, serverName, inboundId, uuid, config, expireAt, status, network, clientName, isAdClaim, createdAt)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          uuidv4(), userId, server.id, server.name, network.inboundId, 
          vpnResult.uuid, vpnResult.config, vpnResult.expireAt, 'active', 
          session.network, vpnResult.clientName, 1, new Date().toISOString()
        );
        dbLocal.prepare('UPDATE users SET lastAdClaimAt = ? WHERE uid = ?').run(new Date().toISOString(), userId);
        dbLocal.prepare('INSERT INTO linkvertise_claims (id, userId, ipAddress, claimTime) VALUES (?, ?, ?, ?)').run(uuidv4(), userId, ip, new Date().toISOString());
        dbLocal.prepare(`
          INSERT INTO transactions (id, userId, userEmail, amount, type, timestamp, note)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(
          uuidv4(), userId, req.user.email, 0, 'ad_claim', new Date().toISOString(), `รับ Config ฟรีจากการดูโฆษณา (${session.network})`
        );
      });
      claimTx();

      res.json({ success: true });
    } catch (err: any) {
      console.error('Ad Claim error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/admin/transactions", authenticate, adminOnly, async (req, res) => {
    try {
      const list = dbLocal.prepare('SELECT * FROM transactions ORDER BY timestamp DESC LIMIT 500').all();
      res.json(list);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/admin/manual-topups", authenticate, adminOnly, async (req, res) => {
    try {
      const list = dbLocal.prepare('SELECT * FROM manual_topups ORDER BY createdAt DESC LIMIT 100').all();
      res.json(list);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/admin/settings/payment", authenticate, adminOnly, async (req, res) => {
    res.json(getSetting('payment', { trueMoneyNumber: '', paymentQrUrl: '', bankHolder: '', minTopup: 50 }));
  });

  app.get("/api/admin/settings/payment_keys", authenticate, adminOnly, async (req, res) => {
    res.json(getSetting('payment_keys', { easySlipApiKey: '', darkxApiKey: '', rdcwClientId: '', rdcwClientSecret: '', slipProvider: 'easyslip' }));
  });

  app.get("/api/admin/settings/payment_methods", authenticate, adminOnly, async (req, res) => {
    res.json(getSetting('payment_methods', { promptpay: 'open', truemoney: 'open', manual: 'open' }));
  });

  app.get("/api/admin/users/mapping", authenticate, adminOnly, async (req, res) => {
    try {
      const users = dbLocal.prepare('SELECT uid, email FROM users').all() as any[];
      const mapping = users.reduce((acc: any, u: any) => ({ ...acc, [u.uid]: u.email }), {});
      res.json(mapping);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
