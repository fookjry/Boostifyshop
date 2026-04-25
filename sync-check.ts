
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import fs from 'fs';

const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf-8'));

const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
const databaseId = (firebaseConfig as any).firestoreDatabaseId;
const dbFirestore = getFirestore(firebaseApp, databaseId);

async function syncCheck() {
    try {
        console.log("Authenticating as server user...");
        await signInWithEmailAndPassword(auth, "server@local.host", "server_password_123");
        console.log("Authentication successful.");

        const snap = await getDocs(collection(dbFirestore, 'users'));
        console.log(`Firestore total users (Authenticated Client SDK): ${snap.size}`);
        
        snap.docs.slice(0, 5).forEach(doc => {
            console.log(`- ${doc.id}: ${doc.data().email}`);
        });
    } catch (e) {
        console.error('Error during sync check:', e);
    }
}

syncCheck();
