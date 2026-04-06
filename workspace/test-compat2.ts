import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
const app = firebase.initializeApp({ projectId: 'test' });
console.log(app.firestore.toString());
