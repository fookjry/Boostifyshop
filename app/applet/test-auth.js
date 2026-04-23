import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import firebaseConfig from './firebase-applet-config.json' assert { type: 'json' };
import axios from 'axios';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

async function test() {
  try {
    const cred = await signInWithEmailAndPassword(auth, 'jry.fook@gmail.com', 'password123');
    const token = await cred.user.getIdToken();
    console.log("Token obtained", token.substring(0, 10));

    const res = await axios.get('http://localhost:3000/api/me', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    console.log("Success:", res.data);
  } catch (err) {
    if (err.response) {
      console.error("Error from server:", err.response.status, err.response.data);
    } else {
      console.error("Other error:", err);
    }
  }
}
test();
