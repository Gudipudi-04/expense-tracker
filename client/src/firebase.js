import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBPn3gDAuQkDkIRpOoVZYNqdHIxDjGgko0",
  authDomain: "expense-tracker-82a75.firebaseapp.com",
  databaseURL: "https://expense-tracker-82a75-default-rtdb.firebaseio.com",
  projectId: "expense-tracker-82a75",
  storageBucket: "expense-tracker-82a75.firebasestorage.app",
  messagingSenderId: "571385941233",
  appId: "1:571385941233:web:4d701b71fbbd8ac11a6d50"
};

const app = initializeApp(firebaseConfig);

export const db = getDatabase(app);
export const auth = getAuth(app);