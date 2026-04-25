
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';

const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf-8'));

const app = initializeApp({
    projectId: firebaseConfig.projectId
});

const databaseId = firebaseConfig.firestoreDatabaseId || '(default)';
const db = getFirestore(app, databaseId);

async function countUsers() {
  try {
      const usersCol = db.collection('users');
      const snap = await usersCol.get();
      console.log(`Firestore total users (Admin SDK): ${snap.size}`);
      
      snap.docs.slice(0, 5).forEach(doc => {
          console.log(`- ${doc.id}: ${doc.data().email}`);
      });
  } catch (e) {
      console.log(`Error: ${e.message}`);
  }
  process.exit(0);
}

countUsers();
