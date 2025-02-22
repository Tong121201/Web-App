// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js";
import { getFirestore, doc, getDoc, query, where, collection, getDocs, updateDoc } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";
import { getMessaging, getToken, isSupported } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-messaging.js";

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

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const messaging = getMessaging(app);

// Function to request notification permission and get FCM token
async function requestNotificationPermission() {
    try {
        // Check basic notification support
        if (!('Notification' in window)) {
            console.error('Notifications not supported');
            return null;
        }

        // Request permission
        const permission = await Notification.requestPermission();
        
        if (permission !== 'granted') {
            console.warn('Notification permission denied');
            return null;
        }

        // Check Firebase messaging support
        const isFirebaseSupported = await isSupported();
        if (!isFirebaseSupported) {
            console.error('Firebase messaging not supported');
            return null;
        }

        // Get FCM token
        const token = await getToken(messaging, { 
            vapidKey: 'BDfeRGFP6NM8-H8j3zlBCxgUdaYXGYZJ11bZ_z00tZN8DZEwFIl9-nP7eJo6khVDPqISEZuBin72IqhWMzL_Dv4'
        });

        return token || null;
    } catch (error) {
        console.error('Notification permission error:', error);
        return null;
    }
}

// Function to store FCM token in Firestore admin collection
async function storeFCMToken(adminId, token) {
    try {
        if (!adminId || !token) {
            console.error('Invalid admin ID or token');
            return;
        }

        // Reference the admin document using their UID
        const adminRef = doc(db, 'admins', adminId);
        
        // Check if document exists
        const docSnap = await getDoc(adminRef);
        
        if (!docSnap.exists()) {
            console.error('Admin document not found:', adminId);
            return;
        }

        // Update only the fcmToken field in the existing document
        await updateDoc(adminRef, {
            fcmToken: token,
            lastTokenUpdate: new Date()
        });
        
        console.log('Admin FCM token updated successfully');
    } catch (error) {
        console.error('Error storing admin FCM token:', error);
    }
}

// Login functionality
const loginForm = document.querySelector('form');
loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const enteredUsername = document.getElementById('admin-username').value;
    const enteredPassword = document.getElementById('admin-password').value;

    try {
        // Query Firestore to find the admin document by username
        const adminsRef = collection(db, "admins");
        const q = query(adminsRef, where("username", "==", enteredUsername));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            console.error("Admin account not found.");
            alert("Admin account does not exist.");
            return;
        }

        let adminDoc = querySnapshot.docs[0];
        const email = adminDoc.data().email;

        try {
            // Sign in with Firebase Authentication
            const userCredential = await signInWithEmailAndPassword(auth, email, enteredPassword);
            const adminId = userCredential.user.uid;

            // Request FCM token after successful login
            const fcmToken = await requestNotificationPermission();
            if (fcmToken) {
                await storeFCMToken(adminId, fcmToken);
            }

            // Save the login info in local storage
            localStorage.setItem('adminUsername', enteredUsername);
            localStorage.setItem('adminEmail', email);

            alert("Login successful!");
            window.location.href = 'adminhome.html';
        } catch (authError) {
            console.error("Authentication error:", authError);
            alert("Wrong Username and Password! Please Try Again.");
        }
    } catch (error) {
        console.error("Error logging in:", error);
        alert("Login failed. Please try again.");
    }
});

// Password visibility toggle functionality
const passwordInput = document.getElementById('admin-password');
const togglePassword = document.getElementById('toggle-password');
togglePassword.addEventListener('click', () => {
    const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
    passwordInput.setAttribute('type', type);
    togglePassword.textContent = type === 'password' ? '👁️' : '🙈';
});