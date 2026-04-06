import { initializeApp } from 'firebase/app';
import { getFirestore, doc, collection, getDoc, getDocs, addDoc, updateDoc, setDoc, deleteDoc, runTransaction, increment, serverTimestamp } from 'firebase/firestore';

const firebaseApp = initializeApp({ projectId: 'test' });
const dbModular = getFirestore(firebaseApp, 'my-db');

const db = {
  collection: (path: string) => {
    const collRef = collection(dbModular, path);
    return {
      doc: (id?: string) => {
        const docRef = id ? doc(dbModular, path, id) : doc(collRef);
        return Object.assign(docRef, {
          get: () => getDoc(docRef),
          set: (data: any, options?: any) => setDoc(docRef, data, options),
          update: (data: any) => updateDoc(docRef, data),
          delete: () => deleteDoc(docRef),
        });
      },
      add: (data: any) => addDoc(collRef, data),
      get: () => getDocs(collRef)
    };
  },
  runTransaction: (callback: any) => runTransaction(dbModular, callback)
};

const FieldValue = {
  increment: (n: number) => increment(n),
  serverTimestamp: () => serverTimestamp()
};

console.log(db.collection('users').doc('123').path);
