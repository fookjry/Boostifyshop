import { initializeApp, getApps } from "firebase-admin/app";
import { getStorage } from "firebase-admin/storage";
import firebaseAppConfig from "./firebase-applet-config.json" assert { type: "json" };
import { v4 as uuidv4 } from "uuid";

const adminApp = initializeApp({
  projectId: firebaseAppConfig.projectId,
  storageBucket: firebaseAppConfig.projectId + ".appspot.com",
}, 'test-app2');

async function test() {
  try {
    const bucket = getStorage(adminApp).bucket();
    const fileName = `test/${uuidv4()}`;
    const file = bucket.file(fileName);
    await file.save("test", { contentType: 'text/plain' });
    console.log("Upload success for appspot.com!");
  } catch (e: any) {
    console.error("Upload error for appspot.com:", e.message);
  }
}
test();
