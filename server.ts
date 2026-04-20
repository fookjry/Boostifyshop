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
import { initializeApp as initializeAdminApp, getApps as getAdminApps } from "firebase-admin/app";
import { getAuth as getAdminAuth } from "firebase-admin/auth";
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

const firebaseAppConfig = {
  apiKey: process.env.FIREBASE_API_KEY || firebaseConfig.apiKey,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || firebaseConfig.authDomain,
  projectId: process.env.FIREBASE_PROJECT_ID || firebaseConfig.projectId,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || firebaseConfig.storageBucket,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || firebaseConfig.messagingSenderId,
  appId: process.env.FIREBASE_APP_ID || firebaseConfig.appId,
};

const firebaseApp = initializeApp(firebaseAppConfig);
const auth = getAuth(firebaseApp);
const databaseId = process.env.FIREBASE_DATABASE_ID || (firebaseConfig as any).firestoreDatabaseId;

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
      } else {
        console.log("Firestore server-side connection test: SUCCESS (Document not found but reachable via Admin SDK)");
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
      const globalSettingsSnap = await db.collection('settings').doc('global').get();
      const webhookUrl = globalSettingsSnap.data()?.discordWebhookUrl;
      
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
    } catch (error) {
      console.error("Token verification failed:", error);
      res.status(401).json({ error: "Unauthorized: Invalid token" });
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

    // Check Firestore for admin role
    try {
      const userSnap = await db.collection('users').doc(uid).get();
      if (userSnap.exists() && userSnap.data()?.role === 'admin') {
        return next();
      }
    } catch (error) {
      try {
        handleFirestoreError(error, OperationType.GET, `users/${uid}`);
      } catch (e: any) {
        return res.status(403).json({ error: "Forbidden: Admin check failed", details: e.message });
      }
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
          const res = await axios.post(endpoint, `username=${username}&password=${password}`, { 
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
    
    // Security Check: Ensure authenticated user is the one making the purchase
    if (req.user.uid !== userId) {
      return res.status(403).json({ success: false, error: "Forbidden: User ID mismatch" });
    }
    
    try {
      // Validate device option and calculate expected price
      const deviceOptionsSnap = await db.collection('device_options').get();
      const deviceOptions = deviceOptionsSnap.docs.map(doc => doc.data());
      const selectedDeviceOption = deviceOptions.find(o => o.count === deviceCount && o.status === true);
      
      let expectedDevicePrice = 0;
      if (deviceCount > 1) {
        if (!selectedDeviceOption) {
          return res.status(400).json({ success: false, error: "Invalid device count selected" });
        }
        expectedDevicePrice = selectedDeviceOption.price;
      }

      const serverRef = db.collection('servers').doc(server.id);
      const userRef = db.collection('users').doc(userId);

      // Fetch private credentials outside transaction
      const credSnap = await serverRef.collection('private').doc('credentials').get();
      const creds = credSnap.exists() ? credSnap.data() : { username: server.username || '', password: server.password || '' };
      const fullServer = { ...server, id: server.id, username: creds?.username, password: creds?.password };

      let vpnData = null;

      await db.runTransaction(async (transaction) => {
        // --- READ PHASE ---
        const userSnap = await transaction.get(userRef);
        if (!userSnap.exists()) {
          throw new Error("User not found");
        }
        
        const userData = userSnap.data() || {};
        const currentBalance = userData.balance || 0;
        if (currentBalance < price) {
          throw new Error("ยอดเงินคงเหลือไม่เพียงพอ (Insufficient balance)");
        }

        const serverSnap = await transaction.get(serverRef);
        if (!serverSnap.exists()) {
          throw new Error("Server not found");
        }
        const serverData = serverSnap.data() || {};
        
        // Validate total price
        const expectedBasePrice = serverData.prices?.[days] || 0;
        const expectedTotalPrice = expectedBasePrice + expectedDevicePrice;
        
        if (price !== expectedTotalPrice) {
          throw new Error("Invalid price calculation");
        }

        const activeUsers = serverData.currentUsers || 0;
        if (serverData.maxUsers && activeUsers >= serverData.maxUsers) {
          throw new Error("เซิร์ฟเวอร์นี้เต็มแล้ว กรุณาเลือกเซิร์ฟเวอร์อื่น (Server is full)");
        }

        // --- WRITE PHASE ---
        // 1. Deduct balance
        transaction.update(userRef, {
          balance: currentBalance - price
        });

        // 2. Increment server currentUsers
        transaction.update(serverRef, {
          currentUsers: activeUsers + 1
        });
      });

      // If transaction succeeds, we have deducted the balance.
      // Now create the VPN config.
      try {
        const { uuid, config, expireAt, clientName } = await createVpnConfig(userEmail || 'user', fullServer, inboundId, days, network, undefined, deviceCount);
        
        vpnData = {
          userId,
          serverId: server.id,
          serverName: server.name,
          inboundId,
          uuid,
          config,
          expireAt,
          status: "active",
          network,
          deviceCount,
          clientName,
          createdAt: new Date().toISOString()
        };

        // Save VPN to Firestore
        await db.collection('vpns').add(vpnData);

        // Save Transaction to Firestore
        await db.collection('transactions').add({
          userId: userId,
          userEmail: userEmail,
          amount: -price,
          type: 'purchase',
          timestamp: new Date().toISOString(),
          note: `ซื้อ VPN ${days} วัน (${network}) - ${deviceCount} อุปกรณ์`
        });

      } catch (vpnError: any) {
        // If VPN creation fails, we MUST refund the user and decrement server users
        console.error("VPN Creation failed, refunding user:", vpnError);
        await userRef.update({ balance: FieldValue.increment(price) });
        await serverRef.update({ currentUsers: FieldValue.increment(-1) });
        throw new Error("Failed to create VPN config: " + vpnError.message);
      }

      res.json({ success: true, vpn: vpnData });
    } catch (error: any) {
      try {
        handleFirestoreError(error, OperationType.WRITE, 'vpn/purchase');
      } catch (e: any) {
        return res.status(400).json({ success: false, error: e.message });
      }
      res.status(400).json({ success: false, error: error.message });
    }
  });

  app.post("/api/vpn/trial", authenticate, apiLimiter, async (req: any, res) => {
    const { userId, userEmail, server, inboundId, network } = req.body;
    
    // Security Check: Ensure authenticated user is the one requesting trial
    if (req.user.uid !== userId) {
      return res.status(403).json({ success: false, error: "Forbidden: User ID mismatch" });
    }
    
    try {
      // Check last trial time to prevent abuse internally
      const userDoc = await db.collection('users').doc(userId).get();
      if (userDoc.exists()) {
        const userData = userDoc.data();
        if (userData?.lastTrialAt) {
          const lastTrialTime = new Date(userData.lastTrialAt).getTime();
          const now = new Date().getTime();
          const hoursSinceLastTrial = (now - lastTrialTime) / (1000 * 60 * 60);
          if (hoursSinceLastTrial < 24) {
            return res.status(403).json({ success: false, error: "ใช้งานทดลองฟรีไปแล้วใน 24 ชั่วโมงที่ผ่านมา" });
          }
        }
      }

      // Fetch server data and private credentials
      const serverRef = db.collection('servers').doc(server.id);
      const serverSnap = await serverRef.get();
      if (!serverSnap.exists()) {
        return res.status(404).json({ success: false, error: "Server not found" });
      }
      const serverData = serverSnap.data() || {};
      
      const credSnap = await serverRef.collection('private').doc('credentials').get();
      const creds = credSnap.exists() ? credSnap.data() : { username: '', password: '' };
      const fullServer = { ...serverData, id: server.id, username: creds?.username, password: creds?.password };

      // 1 hour trial = 1/24 days
      const days = 1/24; 
      const { uuid, config, expireAt, clientName } = await createVpnConfig(userEmail || 'trial', fullServer, inboundId, days, network, 'trail');
      
      const vpnData = {
        userId,
        serverId: server.id,
        serverName: server.name,
        inboundId,
        uuid,
        config,
        expireAt,
        status: "active",
        network,
        deviceCount: 1,
        clientName,
        isTrial: true,
        createdAt: new Date().toISOString()
      };

      // Save VPN to Firestore
      await db.collection('vpns').add(vpnData);

      // Update user profile with trial flag
      await db.collection('users').doc(userId).update({
        hasUsedTrial: true,
        lastTrialAt: new Date().toISOString()
      });

      // Log transaction
      await db.collection('transactions').add({
        userId: userId,
        userEmail: userEmail,
        amount: 0,
        type: 'trial',
        timestamp: new Date().toISOString(),
        note: `ทดลองใช้งาน VPN ฟรี 1 ชั่วโมง (${network})`
      });

      res.json({ 
        success: true, 
        vpn: vpnData
      });
    } catch (error: any) {
      try {
        handleFirestoreError(error, OperationType.WRITE, 'vpn/trial');
      } catch (e: any) {
        return res.status(500).json({ success: false, error: e.message });
      }
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Payment Methods Status (Firestore)
  app.get("/api/payment-methods", async (req, res) => {
    try {
      const snap = await db.collection('settings').doc('payment_methods').get();
      if (snap.exists()) {
        res.json(snap.data());
      } else {
        res.json({ promptpay: true, truemoney: true });
      }
    } catch (error) {
      try {
        handleFirestoreError(error, OperationType.GET, 'settings/payment_methods');
      } catch (e: any) {
        return res.status(500).json({ error: "Failed to fetch payment methods", details: e.message });
      }
      res.status(500).json({ error: "Failed to fetch payment methods" });
    }
  });

  // Topup Verification
  app.post("/api/topup/verify", authenticate, topupLimiter, async (req: any, res) => {
    const { userId, type, data } = req.body;
    // type: 'gift' | 'transfer' (mapped to truemoney/promptpay)
    
    // Security Check: Ensure authenticated user is the one topping up
    if (req.user.uid !== userId) {
      return res.status(403).json({ success: false, error: "Forbidden: User ID mismatch" });
    }
    
    try {
      const snap = await db.collection('settings').doc('payment_methods').get();
      const methods = snap.exists() ? snap.data() : null;
      const methodKey = type === 'gift' ? 'truemoney' : 'promptpay';
      
      const status = methods ? (methods[methodKey] ?? 'open') : 'open';
      
      if (status === 'closed' || status === false) {
        return res.status(403).json({ success: false, error: "ช่องทางการชำระเงินนี้ถูกปิดใช้งานชั่วคราว" });
      }

      if (status === 'maintenance') {
        // Check if user is admin
        const { uid, email } = req.user;
        const isDefaultAdmin = (email === "jry.fook@gmail.com");
        const isServerAdmin = (email === "server@local.host");
        let isAdmin = isDefaultAdmin || isServerAdmin;

        if (!isAdmin) {
          const userSnap = await db.collection('users').doc(uid).get();
          if (userSnap.exists() && userSnap.data()?.role === 'admin') {
            isAdmin = true;
          }
        }

        if (!isAdmin) {
          return res.status(403).json({ success: false, error: "ช่องทางการชำระเงินนี้กำลังปิดปรับปรุง (เฉพาะแอดมิน)" });
        }
      }

      if (type === 'transfer') {
        const paymentSettingsSnap = await db.collection('settings').doc('payment').get();
        const paymentSettings = paymentSettingsSnap.exists() ? paymentSettingsSnap.data() : {};
        
        const paymentKeysSnap = await db.collection('settings').doc('payment_keys').get();
        const paymentKeys = paymentKeysSnap.exists() ? paymentKeysSnap.data() : {};
        
        const apiKey = paymentKeys?.easySlipApiKey || process.env.EASY_SLIP_API_KEY;

        if (!apiKey) {
          return res.status(400).json({ success: false, error: "ระบบยังไม่ได้ตั้งค่า API Key สำหรับตรวจสอบสลิป" });
        }

        if (!data) {
          return res.status(400).json({ success: false, error: "กรุณาอัปโหลดสลิป" });
        }

        // Extract base64 payload
        const base64Image = data.replace(/^data:image\/\w+;base64,/, "");

        try {
          const verifyRes = await axios.post('https://developer.easyslip.com/api/v1/verify', {
            image: base64Image
          }, {
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json'
            }
          });

          if (verifyRes.data.status === 200 || verifyRes.data.data) {
            const slipData = verifyRes.data.data;
            const amount = slipData.amount?.amount || slipData.amount;
            const transRef = slipData.transRef;
            const receiverNameTh = slipData.receiver?.account?.name?.th || '';
            const receiverNameEn = slipData.receiver?.account?.name?.en || '';

            // 1. Minimum amount check
            const minTopup = paymentSettings.minTopup || 50;
            if (amount < minTopup) {
              return res.status(400).json({ success: false, error: `จำนวนเงินขั้นต่ำ ${minTopup} บาท (สลิป: ${amount} บาท)` });
            }

            // 2. Receiver name matching
            const bankHolder = paymentSettings.bankHolder?.trim();
            if (bankHolder) {
              const matched = matchReceiverName(receiverNameTh, bankHolder) || matchReceiverName(receiverNameEn, bankHolder);
              if (!matched) {
                return res.status(400).json({ 
                  success: false, 
                  error: `ผู้รับเงินไม่ตรงกับบัญชีร้าน (สลิป: ${receiverNameTh || receiverNameEn})` 
                });
              }
            }

            // 3. Duplicate slip check & Balance update (Atomic Transaction)
            try {
              await db.runTransaction(async (transaction) => {
                // --- READ PHASE ---
                // Check duplicate slip
                if (transRef) {
                  const slipRef = db.collection('used_slips').doc(transRef);
                  const slipSnap = await transaction.get(slipRef);
                  if (slipSnap.exists()) {
                    throw new Error(`สลิปนี้ถูกใช้งานไปแล้ว รหัส: ${transRef}`);
                  }
                }

                // Get user balance
                const userRef = db.collection('users').doc(userId);
                const userSnap = await transaction.get(userRef);
                const userData = userSnap.data() || {};
                const userEmail = userData.email || 'Unknown';
                const currentBalance = userData.balance || 0;

                // --- WRITE PHASE ---
                if (transRef) {
                  // Mark slip as used
                  transaction.set(db.collection('used_slips').doc(transRef), { 
                    usedAt: new Date().toISOString(), 
                    userId, 
                    amount 
                  });
                }

                // Update user balance
                transaction.update(userRef, {
                  balance: currentBalance + amount
                });

                // Create transaction record
                const txRef = db.collection('transactions').doc();
                transaction.set(txRef, {
                  userId: userId,
                  userEmail: userEmail,
                  amount: amount,
                  type: 'topup',
                  timestamp: new Date().toISOString(),
                  note: `เติมเงินผ่าน PromptPay`,
                  reference: transRef || null
                });
              });
            } catch (txError: any) {
              if (txError.message && txError.message.includes('สลิปนี้ถูกใช้งานไปแล้ว')) {
                return res.status(400).json({ success: false, error: txError.message });
              }
              try {
                handleFirestoreError(txError, OperationType.WRITE, 'topup/verify/transfer');
              } catch (e: any) {
                return res.status(400).json({ success: false, error: e.message });
              }
              return res.status(400).json({ success: false, error: txError.message || "เกิดข้อผิดพลาดในการอัปเดตยอดเงิน" });
            }

            // Return success
            return res.json({ success: true, amount, transRef });
          } else {
            return res.status(400).json({ success: false, error: "สลิปไม่ถูกต้อง หรือไม่สามารถตรวจสอบได้" });
          }
        } catch (error: any) {
          console.error("Easy Slip Error:", error.response?.data || error.message);
          return res.status(400).json({ 
            success: false, 
            error: "ตรวจสอบสลิปไม่ผ่าน: " + (error.response?.data?.message || "สลิปไม่ถูกต้อง หรือถูกใช้งานไปแล้ว") 
          });
        }
      } else {
        // Real TrueMoney Gift Verification
        if (!data) {
          return res.status(400).json({ success: false, error: "กรุณากรอกลิงก์อั่งเปา" });
        }

        let voucherHash = '';
        if (data.includes('v=')) {
          voucherHash = data.split('v=')[1].split('&')[0];
        } else {
          // Try to get from URL path or just use the data if it's a code
          voucherHash = data.split('/').pop()?.split('?')[0] || data;
        }

        if (!voucherHash) {
          return res.status(400).json({ success: false, error: "ลิงก์อั่งเปาไม่ถูกต้อง" });
        }
        
        // Get receiver phone number from settings
        const paymentSettingsSnap = await db.collection('settings').doc('payment').get();
        const paymentSettings = paymentSettingsSnap.exists() ? paymentSettingsSnap.data() : {};
        const mobile = paymentSettings?.trueMoneyNumber?.replace(/[^0-9]/g, '');

        if (!mobile) {
          return res.status(400).json({ success: false, error: "ระบบยังไม่ได้ตั้งค่าเบอร์โทรศัพท์สำหรับรับอั่งเปา" });
        }

        try {
          console.log(`[TrueMoney] Redeeming voucher via DarkX API: ${data} for mobile: ${mobile}`);
          
          const paymentKeysSnap = await db.collection('settings').doc('payment_keys').get();
          const paymentKeys = paymentKeysSnap.exists() ? paymentKeysSnap.data() : {};
          const darkxApiKey = paymentKeys?.darkxApiKey || process.env.DARKX_API_KEY;

          if (!darkxApiKey) {
            return res.status(400).json({ success: false, error: "ระบบยังไม่ได้ตั้งค่า API Key สำหรับรับอั่งเปา (DarkX API)" });
          }

          const redeemRes = await axios.get(`https://api.darkx.shop/tools/truemoney`, {
            params: {
              code: data,
              phone: mobile
            },
            headers: {
              'Accept': 'application/json',
              'x-api-key': darkxApiKey
            },
            timeout: 30000
          });
          
          const resData = redeemRes.data;
          console.log("[TrueMoney DarkX] API Response:", JSON.stringify(resData));

          if (resData.status === true) {
            const amount = parseFloat(resData.amount);

            if (isNaN(amount) || amount <= 0) {
              return res.status(400).json({ success: false, error: "จำนวนเงินไม่ถูกต้อง" });
            }

            // Update user balance and create transaction record (Atomic Transaction)
            try {
              await db.runTransaction(async (transaction) => {
                const userRef = db.collection('users').doc(userId);
                const userSnap = await transaction.get(userRef);
                const userData = userSnap.data() || {};
                const userEmail = userData.email || 'Unknown';
                const currentBalance = userData.balance || 0;

                transaction.update(userRef, {
                  balance: currentBalance + amount
                });

                const txRef = db.collection('transactions').doc();
                transaction.set(txRef, {
                  userId: userId,
                  userEmail: userEmail,
                  amount: amount,
                  type: 'topup',
                  timestamp: new Date().toISOString(),
                  note: `เติมเงินผ่าน อั่งเปา TrueMoney`,
                  reference: voucherHash
                });
              });
            } catch (txError: any) {
              try {
                handleFirestoreError(txError, OperationType.WRITE, 'topup/verify/truemoney');
              } catch (e: any) {
                return res.status(500).json({ success: false, error: e.message });
              }
              return res.status(500).json({ success: false, error: "เติมเงินสำเร็จแต่เกิดข้อผิดพลาดในการอัปเดตยอดเงิน กรุณาติดต่อแอดมิน" });
            }

            return res.json({ success: true, amount });
          } else {
            const errorMsg = resData.msg || "ไม่สามารถรับซองอั่งเปาได้";
            return res.status(400).json({ success: false, error: errorMsg });
          }
        } catch (error: any) {
          console.error("[TrueMoney DarkX] Error:", error.response?.data || error.message);
          return res.status(400).json({ 
            success: false, 
            error: "ไม่สามารถเชื่อมต่อระบบอั่งเปาได้ กรุณาลองใหม่" 
          });
        }
      }
    } catch (error: any) {
      try {
        handleFirestoreError(error, OperationType.GET, 'topup/verify');
      } catch (e: any) {
        return res.status(500).json({ success: false, error: e.message });
      }
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // --- TICKETS API ---
  app.post("/api/tickets/create", authenticate, apiLimiter, async (req: any, res) => {
    try {
      const { title, initialMessage } = req.body;
      const userId = req.user.uid;
      const userEmail = req.user.email;

      if (!title) return res.status(400).json({ error: "กรุณาระบุหัวข้อปัญหา" });

      // Check for existing open tickets (spam protection)
      // We query all user's tickets and filter in-memory to avoid composite index requirement for != operator
      const q = query(
        collection(dbModular, 'tickets'),
        where('userId', '==', userId)
      );
      const userTicketsSnap = await getDocs(q);
      const hasOpenTicket = userTicketsSnap.docs.some(doc => doc.data().status !== 'closed');
      
      if (hasOpenTicket) {
        return res.status(400).json({ 
          error: "คุณมี Ticket ที่ยังเปิดค้างอยู่ 1 รายการ กรุณารอให้แอดมินปิดงานเดิมก่อนจึงจะเปิดใหม่ได้" 
        });
      }

      // Create ticket document
      const docRef = await db.collection('tickets').add({
        userId,
        userEmail,
        title,
        status: 'open',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      const ticketId = docRef.id;

      // Notify Discord
      sendDiscordNotification(`🆕 **Ticket ใหม่!**\n**ID:** \`${ticketId}\`\n**หัวข้อ:** ${title}\n**จากผู้ใช้:** ${userEmail} (${userId})`);

      // Add initial message
      if (initialMessage) {
        await db.collection('tickets').doc(ticketId).collection('messages').add({
          senderId: userId,
          senderRole: 'user',
          content: initialMessage,
          createdAt: new Date().toISOString()
        });
      }

      return res.json({ success: true, ticketId });

    } catch (error: any) {
      console.error("Create ticket error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  const replyLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 30, // Limit each IP to 30 replies per 5 minutes
    message: { error: "Too many messages, please wait a moment" },
  });

  app.post("/api/tickets/:ticketId/reply", authenticate, replyLimiter, async (req: any, res) => {
    try {
      const { ticketId } = req.params;
      const { content, role } = req.body;
      const userId = req.user.uid;
      
      const ticketSnap = await db.collection('tickets').doc(ticketId).get();
      if (!ticketSnap.exists()) return res.status(404).json({ error: "ไม่พบ Ticket" });
      
      const ticketData = ticketSnap.data();
      const isOwner = ticketData.userId === userId;
      const isAdminReply = role === 'admin';
      
      if (!isOwner && !isAdminReply) return res.status(403).json({ error: "ไม่มีสิทธิ์ตอบกลับ Ticket นี้" });

      await db.collection('tickets').doc(ticketId).collection('messages').add({
        senderId: userId,
        senderRole: role,
        content: content || '',
        createdAt: new Date().toISOString()
      });

      await db.collection('tickets').doc(ticketId).update({
        status: isAdminReply ? 'answered' : 'waiting',
        updatedAt: new Date().toISOString()
      });

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

      const ticketRef = db.collection('tickets').doc(ticketId);
      const ticketSnap = await ticketRef.get();
      if (!ticketSnap.exists()) return res.status(404).json({ error: "ไม่พบ Ticket" });
      
      const ticketData = ticketSnap.data();
      const isOwner = ticketData.userId === userId;
      
      let isAdminUser = false;
      if (!isOwner) {
         const userSnap = await db.collection('users').doc(userId).get();
         if (userSnap.exists() && userSnap.data()?.role === 'admin') isAdminUser = true;
      }
      
      if (!isOwner && !isAdminUser) return res.status(403).json({ error: "ไม่มีสิทธิ์ปิด Ticket นี้" });

      // Images are stored as base64 in the documents directly,
      // so no need to delete them from Cloud Storage.

      // Update ticket status
      await ticketRef.update({
        status: 'closed',
        closedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      // Notify Discord
      sendDiscordNotification(`✅ **Ticket ปิดงานแล้ว!**\n**ID:** \`${ticketId}\`\n**หัวข้อ:** ${ticketData.title}\n**ผู้ปิดงาน:** ${isAdminUser ? 'แอดมิน' : 'ลูกค้า'} (${req.user.email || 'Unknown'})`);

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
      // 1. Spam check: Limit to 3 pending requests
      const pendingQ = query(collection(dbModular, 'manual_topups'), where('userId', '==', userId));
      const pendingSnap = await getDocs(pendingQ);
      
      let pendingCount = 0;
      pendingSnap.docs.forEach((doc: any) => {
        if (doc.data().status === 'pending') {
          pendingCount++;
        }
      });

      if (pendingCount >= 3) {
        return res.status(400).json({ success: false, error: "คุณมีรายการรอตรวจสอบมากเกินไป กรุณารอแอดมินดำเนินการ" });
      }

      // 2. Hash image to prevent duplicate slip uploads
      const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
      const imageHash = crypto.createHash('sha256').update(base64Data).digest('hex');

      // Check if hash already exists in any manual topup
      const existingSlipQ = query(collection(dbModular, 'manual_topups'), where('slipHash', '==', imageHash), limit(1));
      const existingSlipSnap = await getDocs(existingSlipQ);
      
      if (!existingSlipSnap.empty) {
        return res.status(400).json({ success: false, error: "สลิปนี้ถูกใช้งานไปแล้วในระบบ กรุณาใช้สลิปอื่น" });
      }

      // Fetch user email
      const userSnap = await db.collection('users').doc(userId).get();
      const userEmail = userSnap.exists() ? userSnap.data()?.email : 'Unknown';

      // Ensure base64 is not excessively large (limit to approx 500KB)
      if (base64Data.length > 700000) {
         return res.status(400).json({ success: false, error: "ขนาดไฟล์รูปภาพใหญ่เกินไป กรุณาลดขนาดภาพ (ไม่เกิน 500KB)" });
      }

      // 4. Save request
      await db.collection('manual_topups').add({
        userId,
        userEmail,
        amount: Number(amount),
        slipImage: imageBase64,
        slipHash: imageHash,
        status: 'pending',
        createdAt: new Date().toISOString()
      });

      return res.json({ success: true });
    } catch (error: any) {
      console.error("Manual topup error:", error);
      return res.status(500).json({ success: false, error: "เกิดข้อผิดพลาดในการส่งข้อมูล" });
    }
  });

  // Admin: Approve Manual Topup
  app.post("/api/admin/topup/manual/approve", authenticate, adminOnly, async (req: any, res) => {
    const { id, amount } = req.body; // Amount can be overridden by admin
    if (!id || !amount || isNaN(amount) || amount <= 0) {
      return res.status(400).json({ success: false, error: "ข้อมูลไม่ถูกต้อง" });
    }

    try {
      await db.runTransaction(async (transaction) => {
        const topupRef = db.collection('manual_topups').doc(id);
        const topupSnap = await transaction.get(topupRef);

        if (!topupSnap.exists()) {
          throw new Error("ไม่พบรายการแจ้งโอนเงิน");
        }

        const topupData = topupSnap.data() || {};
        if (topupData.status !== 'pending') {
          throw new Error(`รายการนี้ถูกดำเนินการไปแล้ว (สถานะ: ${topupData.status})`);
        }

        const userId = topupData.userId;
        const userRef = db.collection('users').doc(userId);
        const userSnap = await transaction.get(userRef);
        const currentBalance = userSnap.exists() ? userSnap.data()?.balance || 0 : 0;
        const userEmail = topupData.userEmail || (userSnap.exists() ? userSnap.data()?.email : 'Unknown');

        // Update Topup
        transaction.update(topupRef, {
          status: 'approved',
          approvedAmount: Number(amount),
          updatedAt: new Date().toISOString(),
          processedBy: req.user.uid
        });

        // Update User Balance
        transaction.update(userRef, {
          balance: currentBalance + Number(amount)
        });

        // Add Transaction Record
        const txRef = db.collection('transactions').doc();
        transaction.set(txRef, {
          userId: userId,
          userEmail: userEmail,
          amount: Number(amount),
          type: 'topup',
          timestamp: new Date().toISOString(),
          note: `เติมเงินสำรอง (แจ้งโอน) - รหัสชั่วคราว`,
          reference: `MANUAL-${id.substring(0, 8)}`
        });
      });

      res.json({ success: true });
    } catch (error: any) {
      return res.status(400).json({ success: false, error: error.message });
    }
  });

  // Admin: Reject Manual Topup
  app.post("/api/admin/topup/manual/reject", authenticate, adminOnly, async (req: any, res) => {
    const { id, reason } = req.body;
    if (!id || !reason) {
      return res.status(400).json({ success: false, error: "กรุณาระบุเหตุผลการปฏิเสธ" });
    }

    try {
      await db.runTransaction(async (transaction) => {
        const topupRef = db.collection('manual_topups').doc(id);
        const topupSnap = await transaction.get(topupRef);

        if (!topupSnap.exists()) {
          throw new Error("ไม่พบรายการแจ้งโอนเงิน");
        }

        const topupData = topupSnap.data() || {};
        if (topupData.status !== 'pending') {
          throw new Error(`รายการนี้ถูกดำเนินการไปแล้ว (สถานะ: ${topupData.status})`);
        }

        transaction.update(topupRef, {
          status: 'rejected',
          reason: reason,
          updatedAt: new Date().toISOString(),
          processedBy: req.user.uid
        });
      });

      res.json({ success: true });
    } catch (error: any) {
      return res.status(400).json({ success: false, error: error.message });
    }
  });

  // Delete User (Admin Only)
  app.delete("/api/admin/users/:userId", authenticate, adminOnly, async (req: any, res) => {
    const { userId } = req.params;
    try {
      // Try to delete from Auth first
      let authDeleted = false;
      try {
        await getAdminAuth(adminApp).deleteUser(userId);
        authDeleted = true;
      } catch (authError: any) {
        console.error("Failed to delete user from Auth:", authError);
        // If it's a "user not found" error, we can still proceed to delete from Firestore
        if (authError.code === 'auth/user-not-found') {
          authDeleted = true;
        } else if (authError.code === 'auth/internal-error' || authError.message.includes('identitytoolkit')) {
          console.warn("Auth deletion failed due to Identity Toolkit API being disabled in the sandbox environment. Proceeding with Firestore deletion.");
        } else {
          console.warn("Auth deletion failed for other reasons. Proceeding with Firestore deletion.");
        }
      }

      // Delete from Firestore
      await db.collection('users').doc(userId).delete();
      
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

  // --- Linkvertise Ad Config API ---
  app.post("/api/linkvertise/init", authenticate, apiLimiter, async (req: any, res) => {
    try {
      const userId = req.user.uid;
      const ip = req.headers['x-forwarded-for']?.toString().split(',')[0] || req.socket.remoteAddress;
      const { serverId, network } = req.body;

      if (!serverId || !network) return res.status(400).json({ error: "ข้อมูลไม่ครบถ้วน (ต้องการ serverId, network)" });

      // Check User Cooldown (6 hours limit)
      const userRef = db.collection('users').doc(userId);
      const userSnap = await userRef.get();
      if (userSnap.exists()) {
        const userData = userSnap.data();
        if (userData?.lastAdClaimAt) {
          const hoursSince = (Date.now() - new Date(userData.lastAdClaimAt).getTime()) / (1000 * 60 * 60);
          if (hoursSince < 6) {
            return res.status(400).json({ error: `คุณเพิ่งรับสิทธิ์ไป กรุณารออีก ${(6 - hoursSince).toFixed(1)} ชั่วโมง` });
          }
        }
      }

      // Check IP Cooldown (in-memory sort for safety)
      const qIp = query(collection(dbModular, 'linkvertise_claims'), where('ipAddress', '==', ip));
      const snapIp = await getDocs(qIp);
      let latestClaimTime = 0;
      snapIp.docs.forEach((doc: any) => {
         const t = new Date(doc.data().claimTime).getTime();
         if (t > latestClaimTime) latestClaimTime = t;
      });

      if (latestClaimTime > 0) {
        const hoursSince = (Date.now() - latestClaimTime) / (1000 * 60 * 60);
        if (hoursSince < 6) {
           return res.status(400).json({ error: `เครือข่าย/IP นี้เพิ่งรับสิทธิ์ไป กรุณารออีก ${(6 - hoursSince).toFixed(1)} ชั่วโมง` });
        }
      }

      // Verify Linkvertise URL from admin settings
      const settingsSnap = await db.collection('settings').doc('global').get();
      const settingsData = settingsSnap.data();
      const linkvertiseUrl = settingsData?.linkvertiseUrl;
      const linkvertiseEnabled = settingsData?.linkvertiseEnabled !== false;

      if (!linkvertiseEnabled) {
         return res.status(403).json({ error: "ระบบดูโฆษณาปิดปรับปรุงชั่วคราว" });
      }

      if (!linkvertiseUrl) {
         return res.status(400).json({ error: "แอดมินยังไม่ได้ตั้งค่าลิงก์ Linkvertise กรุณาติดต่อทีมงาน" });
      }

      // Create a pending tracking token
      const token = crypto.randomBytes(16).toString('hex');
      await db.collection('linkvertise_sessions').doc(token).set({
        userId,
        userEmail: req.user.email,
        ipAddress: ip,
        serverId,
        network,
        status: 'pending',
        createdAt: new Date().toISOString()
      });

      res.json({ success: true, token, targetUrl: linkvertiseUrl });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/linkvertise/claim", authenticate, apiLimiter, async (req: any, res) => {
    try {
      const { token } = req.body;
      const userId = req.user.uid;
      const ip = req.headers['x-forwarded-for']?.toString().split(',')[0] || req.socket.remoteAddress;

      const sessionRef = db.collection('linkvertise_sessions').doc(token);
      const sessionSnap = await sessionRef.get();

      if (!sessionSnap.exists() || sessionSnap.data()?.status !== 'pending') {
        return res.status(400).json({ error: "Session ยืนยันไม่ถูกต้องหรือถูกใช้งานไปแล้ว" });
      }

      const sessionData = sessionSnap.data();

      // Ensure user is the same
      if (sessionData.userId !== userId) {
        return res.status(403).json({ error: "สิทธิ์นี้เป็นของบัญชีผู้ใช้อื่น ไม่สามารถรับได้" });
      }

      // Network lookup to get inboundId
      const netsSnap = await db.collection('networks').get();
      const networkDoc = netsSnap.docs.find((d: any) => d.data()?.name === sessionData.network);
      if (!networkDoc) return res.status(404).json({ error: "ไม่พบข้อมูลเครือข่าย" });
      const inboundId = networkDoc.data()?.inboundId;

      // Server lookup
      const serverRef = db.collection('servers').doc(sessionData.serverId);
      const serverSnap = await serverRef.get();
      if (!serverSnap.exists()) return res.status(404).json({ error: "เซิร์ฟเวอร์โดนลบหรือไม่พร้อมใช้งาน" });
      const serverData = serverSnap.data();
      const credSnap = await serverRef.collection('private').doc('credentials').get();
      const creds = credSnap.exists() ? credSnap.data() : null;
      const fullServer = { ...serverData, id: sessionData.serverId, username: creds?.username, password: creds?.password };

      // Generate 6 hours VPN
      const days = 0.25; // 6 hours
      const { uuid, config, expireAt, clientName } = await createVpnConfig(req.user.email || 'ad_user', fullServer, inboundId, days, sessionData.network, 'ad');

      // Update session to claimed
      await sessionRef.update({ status: 'claimed', claimedAt: new Date().toISOString() });

      const vpnData = {
        userId,
        serverId: sessionData.serverId,
        serverName: serverData.name,
        inboundId,
        uuid,
        config,
        expireAt,
        status: "active",
        network: sessionData.network,
        deviceCount: 1,
        clientName,
        isAdClaim: true,
        createdAt: new Date().toISOString()
      };

      // Add VPN
      await db.collection('vpns').add(vpnData);

      // Add to claims for cooldown tracking
      await db.collection('linkvertise_claims').add({
        userId,
        ipAddress: ip,
        claimTime: new Date().toISOString(),
        vpnId: uuid
      });

      // Update user lastAdClaimAt
      await db.collection('users').doc(userId).update({
        lastAdClaimAt: new Date().toISOString()
      });

      // Log transaction
      await db.collection('transactions').add({
        userId: userId,
        userEmail: req.user.email,
        amount: 0,
        type: 'ad_claim',
        timestamp: new Date().toISOString(),
        note: `รับ Config ฟรีจากการดูโฆษณา (${sessionData.network})`
      });

      res.json({ success: true, vpn: vpnData });
    } catch (err: any) {
      console.error('Ad Claim error:', err);
      res.status(500).json({ error: err.message });
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
