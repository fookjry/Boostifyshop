import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import firebaseConfig from "./firebase-applet-config.json" with { type: "json" };

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || '(default)');

async function check() {
  const cols = ['users', 'servers', 'networks'];
  for (const colName of cols) {
    const snap = await getDocs(collection(db, colName));
    console.log(`${colName}: ${snap.size} documents`);
    if (snap.size > 0) {
        console.log(`Example from ${colName}:`, snap.docs[0].data());
    }
  }
  process.exit(0);
}

check().catch(console.error);
