
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBPn3gDAuQkDkIRpOoVZYNqdHIxDjGgko0",
  authDomain: "expense-tracker-82a75.firebaseapp.com",
  projectId: "expense-tracker-82a75",
  storageBucket: "expense-tracker-82a75.firebasestorage.app",
  messagingSenderId: "571385941233",
  appId: "1:571385941233:web:4d701b71fbbd8ac11a6d50"
};

const app = getApps().length
  ? getApp()
  : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
