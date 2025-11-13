// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional

const firebaseConfig = {
  apiKey: "AIzaSyBDTV5C8oLDYs3uGoJdrdsr8mGFCQ0dGsI",
  authDomain: "saturnalia-dev.firebaseapp.com",
  projectId: "saturnalia-dev",
  storageBucket: "saturnalia-dev.appspot.com",
  messagingSenderId: "29923356556",
  appId: "1:29923356556:web:258ec4d918cb08efe2b0a9",
  measurementId: "G-PCJ5TVE2CJ",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
// const analytics = getAnalytics(app);
const db = getFirestore(app);
const auth = getAuth(app);

export { app, db, auth };
