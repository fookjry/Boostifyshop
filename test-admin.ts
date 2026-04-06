import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';

async function test() {
  try {
    const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
    // Initialize with project ID from config
    const app = initializeApp({
      projectId: config.projectId
    });
    // Use default database
    const db = getFirestore(app);
    console.log(`Testing Firestore with project: ${config.projectId}, database: (default)`);
    const snap = await db.collection('settings').doc('global').get();
    console.log('Success:', snap.exists ? snap.data() : 'Document not found but reachable');
  } catch (e) {
    console.error('Error:', e);
  }
}
test();
