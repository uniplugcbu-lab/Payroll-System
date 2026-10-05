// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyC2Cj_Yr8PEl7BqbFE6-A2NywTO1dl5ME8",
  authDomain: "hr-payroll-system-83dc0.firebaseapp.com",
  projectId: "hr-payroll-system-83dc0",
  storageBucket: "hr-payroll-system-83dc0.firebasestorage.app",
  messagingSenderId: "1027518775595",
  appId: "1:1027518775595:web:c479422bab62d30a2d456e"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Firebase services
const auth = firebase.auth();
const db = firebase.firestore();