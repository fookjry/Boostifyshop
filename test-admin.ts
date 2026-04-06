import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';

async function test() {
  try {
    const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
    const app = initializeApp({
      credential: applicationDefault(),
      projectId: config.projectId
    });
    const db = getFirestore(app, config.firestoreDatabaseId);
    const snap = await db.collection('settings').doc('payment_methods').get();
    console.log('Success:', snap.data());
  } catch (e) {
    console.error('Error:', e);
  }
}
test();
