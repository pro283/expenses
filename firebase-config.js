// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCibmvindEDpKCLBMJPaW9B8c6lH6zOY-Q",
  authDomain: "expenses-3229c.firebaseapp.com",
  projectId: "expenses-3229c",
  storageBucket: "expenses-3229c.firebasestorage.app",
  messagingSenderId: "968978511658",
  appId: "1:968978511658:web:6ff58afb33a8a368751053",
  measurementId: "G-XLYB5P6PFK"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const database = firebase.database();
