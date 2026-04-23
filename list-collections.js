import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import firebaseConfig from './firebase-applet-config.json' with { type: 'json' };

const app = initializeApp({
    projectId: firebaseConfig.projectId
});

const db = getFirestore(app, '(default)');

async function check() {
  try {
      const collections = await db.listCollections();
      console.log('Collections:', collections.map(c => c.id).join(', '));
      for (const col of collections) {
          const snap = await col.limit(1).get();
          console.log(`- ${col.id}: ${snap.size > 0 ? 'Has data' : 'Empty'}`);
      }
  } catch (e) {
      console.log(`Error: ${e.message}`);
  }
  process.exit(0);
}

check();
