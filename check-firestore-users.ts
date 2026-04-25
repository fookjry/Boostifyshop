
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import fs from 'fs';

const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf-8'));

const firebaseApp = initializeApp(firebaseConfig);
const databaseId = (firebaseConfig as any).firestoreDatabaseId;
const dbFirestore = getFirestore(firebaseApp, databaseId);

async function checkUsers() {
    try {
        const snap = await getDocs(collection(dbFirestore, 'users'));
        console.log(`Firestore total users: ${snap.size}`);
        
        // Let's also check if there are any specific users that are not in SQLite
        const firestoreUids = snap.docs.map(doc => doc.id);
        
        // We can't easily query SQLite here without better-sqlite3
        // So we just log the first few emails for verification
        console.log('Sample Firestore UIDs (first 5):', firestoreUids.slice(0, 5));
    } catch (e) {
        console.error('Error checking Firestore:', e);
    }
}

checkUsers();
