// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBBRVlnWGx7BypjIc0XMk0IVUfZRsh5h3c",
    authDomain: "my-apps-10637.firebaseapp.com",
    projectId: "my-apps-10637",
    storageBucket: "my-apps-10637.firebasestorage.app",
    messagingSenderId: "1009776210487",
    appId: "1:1009776210487:web:26b53167a4a9e917ac85b2"
};

// Initialize Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

export { db, storage };
