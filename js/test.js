import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js";
import { getFirestore, doc, setDoc } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyDOtb-QtwEqIaWPYOjvGsS4HGycXhZ8eZw",
    authDomain: "myproject-9638b.firebaseapp.com",
    databaseURL: "https://myproject-9638b-default-rtdb.firebaseio.com",
    projectId: "myproject-9638b",
    storageBucket: "myproject-9638b.appspot.com",
    messagingSenderId: "419251176337",
    appId: "1:419251176337:web:2e33df046378ef6c651030"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Auth and Firestore
const auth = getAuth(app);
const db = getFirestore(app);

// Create a new admin user
async function createAdminAccount() {
    const email = "cdpc@qiu.edu.my";
    const password = "Admin@12345"; // Set a secure password
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const uid = userCredential.user.uid; // Get the UID of the new user
        console.log("Admin account created with UID:", uid);

        // Now set up their data in Firestore
        const adminData = {
            contact: "0123456789",
            email: email,
            fullname: "Career and Professional Development Center",
            profilePicture: "https://firebasestorage.googleapis.com/v0/b/myproject-9638b.appspot.com/o/admin%2Fprofile-pictures%2Fqiu.png?alt=media&token=55f7518a-4514-4049-98e6-e67a5ab07c8e", // Or you can leave it as an empty string
            username: "Quest1234"
        };

        // Set the admin data in Firestore
        await setDoc(doc(db, 'admins', uid), adminData);
        console.log("Admin data created successfully for UID:", uid);
    } catch (error) {
        console.error("Error creating admin account:", error.message);
    }
}

// Run the function once to create the account
createAdminAccount();
