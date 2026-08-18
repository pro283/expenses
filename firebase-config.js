import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";
import { getAuth, GoogleAuthProvider, setPersistence, browserLocalPersistence } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyCibmvindEDpKCLBMJPaW9B8c6lH6zOY-Q",
  authDomain: "expenses-3229c.firebaseapp.com",
  projectId: "expenses-3229c",
  storageBucket: "expenses-3229c.firebasestorage.app",
  messagingSenderId: "968978511658",
  appId: "1:968978511658:web:6ff58afb33a8a368751053",
  measurementId: "G-XLYB5P6PFK"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
export const auth = getAuth(app);

// Keep user persistently logged in across reloads/browser close
setPersistence(auth, browserLocalPersistence).catch((error) => {
    console.error("Auth persistence error:", error);
});

export const provider = new GoogleAuthProvider();

export function getStoredMonth() {
    return localStorage.getItem('selectedMonth') || new Date().toISOString().slice(0, 7);
}

export function setStoredMonth(month) {
    localStorage.setItem('selectedMonth', month);
}

export function evaluateAmount(str) {
    if (!str) return 0;
    const parts = str.toString().split('+');
    return parts.reduce((sum, part) => sum + (parseFloat(part) || 0), 0);
}
