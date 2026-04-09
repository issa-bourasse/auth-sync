// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDL3qvg1lb2hIWXAQaRvokNuJOnVhbTonw",
  authDomain: "authgm-fe84f.firebaseapp.com",
  projectId: "authgm-fe84f",
  storageBucket: "authgm-fe84f.firebasestorage.app",
  messagingSenderId: "597496218057",
  appId: "1:597496218057:web:5275e4f2c564c0f9a1e818",
  measurementId: "G-885PXVD6N8"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export default app;