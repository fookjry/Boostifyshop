import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import firebaseConfig from './firebase-applet-config.json' with { type: 'json' };

const app = initializeApp({
    projectId: firebaseConfig.projectId
});

const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || '(default)');

async function check() {
  const cols = ['users', 'servers', 'networks'];
  for (const colName of cols) {
    try {
        const snap = await db.collection(colName).listDocuments();
        console.log(`${colName}: ${snap.length} documents`);
    } catch (e) {
        console.log(`Error checking ${colName}: ${e.message}`);
    }
  }
  process.exit(0);
}

check();
