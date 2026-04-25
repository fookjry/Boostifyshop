
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';

const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf-8'));

const app = initializeApp({
    projectId: firebaseConfig.projectId
});

const databaseId = firebaseConfig.firestoreDatabaseId || '(default)';
const db = getFirestore(app, databaseId);

async function inspectData() {
  try {
      const usersCol = db.collection('users');
      const snap = await usersCol.get();
      console.log(`Firestore total users (Admin SDK): ${snap.size}`);
      
      const firestoreEmails = new Set();
      snap.docs.forEach(doc => {
          const data = doc.data();
          if (data.email) firestoreEmails.add(data.email.toLowerCase());
      });

      console.log('Sample Firestore Emails (first 10):');
      Array.from(firestoreEmails).slice(0, 10).forEach(email => console.log(`- ${email}`));

      // Check for specifically "missing" users if possible
      // But we need to compare with local
  } catch (e) {
      console.log(`Error: ${e.message}`);
  }
  process.exit(0);
}

inspectData();
