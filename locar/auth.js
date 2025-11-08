// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-analytics.js";
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut 
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-auth.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBDTV5C8oLDYs3uGoJdrdsr8mGFCQ0dGsI",
  authDomain: "saturnalia-dev.firebaseapp.com",
  projectId: "saturnalia-dev",
  storageBucket: "saturnalia-dev.firebasestorage.app",
  messagingSenderId: "29923356556",
  appId: "1:29923356556:web:258ec4d918cb08efe2b0a9",
  measurementId: "G-PCJ5TVE2CJ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Initialize Firebase Authentication
export const auth = getAuth(app);

// Create provider instance
const provider = new GoogleAuthProvider();

// Google sign-in function
export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, provider);
    return result.user;
  } catch (error) {
    console.error("Authentication error:", error);
    return null;
  }
};

// Sign-out function
export const signOutUser = async () => {
  await signOut(auth);
};
