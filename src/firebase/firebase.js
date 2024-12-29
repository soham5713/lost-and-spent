// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAqv4ftGLpm8U-KR1anwos-X6BEYzEoYR4",
  authDomain: "expensify-ad1be.firebaseapp.com",
  projectId: "expensify-ad1be",
  storageBucket: "expensify-ad1be.firebasestorage.app",
  messagingSenderId: "815245548290",
  appId: "1:815245548290:web:2143a515f2d7f00a99c01b",
  measurementId: "G-KRLMLSRC62"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
const db = getFirestore(app);

// Initialize Authentication
const auth = getAuth(app);

export { app, db, auth };
