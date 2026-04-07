import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, doc, getDocFromServer, memoryLocalCache } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);

// Initialize Firestore with memoryLocalCache to prevent IndexedDB connection errors in iframe
const databaseId = firebaseConfig.firestoreDatabaseId || '(default)';
console.log(`Initializing Firestore with database: ${databaseId}`);

export const db = initializeFirestore(app, {
  localCache: memoryLocalCache(),
  experimentalAutoDetectLongPolling: true,
}, databaseId);

export const auth = getAuth(app);

// Validate Connection to Firestore
async function testConnection() {
  try {
    // Try to fetch a non-existent document just to test connectivity
    await getDocFromServer(doc(db, 'system', 'health-check'));
    console.log("Firestore connection test: Reachable");
  } catch (error) {
    if (error instanceof Error && (error.message.includes('the client is offline') || error.message.includes('unavailable'))) {
      console.error("Firestore connection error: The client is offline or service is unavailable. Please check your Firebase configuration and ensure the database is provisioned.");
    }
    // We don't throw here to avoid crashing the whole app if it's a transient issue
  }
}

testConnection();
