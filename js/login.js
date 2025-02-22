// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js";
import { getFirestore, doc, getDoc, collection, query, where, getDocs, setDoc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";
import { getMessaging, getToken, isSupported  } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-messaging.js";

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
const auth = getAuth(app);
auth.languageCode = 'en';
const googleProvider = new GoogleAuthProvider(); // Google Provider
// Initialize Firestore
const db = getFirestore(app);
const messaging = getMessaging(app);        

// Password toggle functionality
const togglePasswordBtn = document.getElementById('toggle-password');
const passwordInput = document.getElementById('password');

togglePasswordBtn.addEventListener('click', () => {
    const type = passwordInput.type === 'password' ? 'text' : 'password';
    passwordInput.type = type;
    togglePasswordBtn.textContent = type === 'password' ? '👁️' : '🙈';
});

// Function to check account status
async function checkAccountStatus(userId) {
    const userRef = doc(db, 'employers', userId);
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists()) {
        const status = userDoc.data().status;
        return status === 'Active';
    }
    return false;
}

// Submit button
const submit = document.getElementById('submit');
let isSubmitting = false; // Flag to track submission state

submit.addEventListener("click", async (event) => {
    event.preventDefault();  // Prevent form from submitting traditionally
    
    // Prevent multiple submissions
    if (isSubmitting) {
        console.log("Submission already in progress. Please wait.");
        return;
    }

    isSubmitting = true; // Set the flag to true
    submit.disabled = true; // Disable the button

    try {
        const email = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        // Check if any fields are empty
        if (!email || !password) {
            alert("Email and password must be filled out!");
            return;
        }

        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        console.log('Login successful, user ID:', user.uid);
        // Check account status
        const isActive = await checkAccountStatus(user.uid);
        
        if (isActive) {
            // Request FCM token
            const fcmToken = await requestNotificationPermission();
            if (fcmToken) {
                await storeFCMToken(user.uid, fcmToken);
            }

            alert('Login Successful');
            localStorage.setItem('loggedInUserId', user.uid);
            window.location.href = "homepage.html";
        } else {
            // If account is blocked, sign out the user
            await auth.signOut();
            alert('Account is blocked. Please contact support for assistance.');
        }
    } catch (error) {
        const errorCode = error.code;
        if(errorCode === 'auth/invalid-credential'){
            alert('Incorrect Email or Password!');
        } else {
            alert('Account does not exist!');
        }
    } finally {
        isSubmitting = false; // Reset the flag
        submit.disabled = false; // Re-enable the button
    }
});

// Google Login
const googleLoginBtn = document.getElementById('google-btn');
googleLoginBtn.addEventListener('click', async function(event) {
    event.preventDefault();

    try {
        const result = await signInWithPopup(auth, googleProvider);
        const user = result.user;

        // Reference the Firestore collection and document
        const userRef = doc(db, 'employers', user.uid);
        const docSnapshot = await getDoc(userRef);
        
        if (docSnapshot.exists()) {
            // Check account status for Google login
            const isActive = await checkAccountStatus(user.uid);
            
            if (!isActive) {
                await auth.signOut();
                alert('Account is blocked. Please contact support for assistance.');
                return;
            }

            // Request FCM token BEFORE redirect
            console.log('Requesting FCM token...');
            const fcmToken = await requestNotificationPermission();
            console.log('FCM token received:', fcmToken);

            if (fcmToken) {
                await storeFCMToken(user.uid, fcmToken);
                console.log('FCM token stored successfully');
            } else {
                console.warn('Failed to get FCM token');
            }

            localStorage.setItem('loggedInUserId', user.uid);
            console.log('Redirecting to homepage...');
            window.location.href = "homepage.html";
        } else {
            // For new users
            console.log('New user detected, redirecting to complete profile...');
            window.location.href = "complete-profile.html?email=" + encodeURIComponent(user.email);
        }
    } catch (error) {
        console.error("Error during Google login:", error);
        alert('Failed to login with Google. Please try again.');
    }
});

// Rest of the code remains the same
const resetLink = document.getElementById('reset');
const popupContainer = document.getElementById('popup-container');
const closePopupBtn = document.getElementById('close-popup');
const resetEmailInput = document.getElementById('reset-email');
const resetForm = popupContainer.querySelector('form');

resetLink.addEventListener('click', (e) => {
    e.preventDefault();
    popupContainer.style.display = 'flex';
});

closePopupBtn.addEventListener('click', () => {
    popupContainer.style.display = 'none';
});

popupContainer.addEventListener('click', (e) => {
    if (e.target === popupContainer) {
        popupContainer.style.display = 'none';
    }
});

resetForm.addEventListener('submit', async function (event) {
    event.preventDefault();

    const email = resetEmailInput.value;

    const emailUsed = await checkIfEmailUsed(email);
    if (emailUsed) {
        sendPasswordResetEmail(auth, email)
        .then(() => {
            alert("Check your email for password reset instructions.");
            popupContainer.style.display = 'none';
        })
        .catch((error) => {
            const errorMessage = error.message;
            alert(errorMessage);
        });
    } else {
        alert("Please use a valid email.");
        return;
    }
});

async function checkIfEmailUsed(email) {
    const q = query(collection(db, "employers"), where("company_email", "==", email));
    const querySnapshot = await getDocs(q);
    return !querySnapshot.empty;
}

document.getElementById('close-popup').addEventListener('click', () => {
    document.getElementById('reset-email').value = '';
    document.getElementById('popup-container').style.display = 'none';
});



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

// Store FCM token in Firestore
async function storeFCMToken(userId, token) {
    try {
        // Only proceed if we have a valid userId and token
        if (!userId || !token) {
            console.error('Invalid user ID or token');
            return;
        }

        // Reference the specific user document using their UID
        const userRef = doc(db, 'employers', userId);
        
        // Check if document exists
        const docSnap = await getDoc(userRef);
        
        if (!docSnap.exists()) {
            console.error('User document not found:', userId);
            return; // Exit the function if document doesn't exist
        }

        // Update only the fcmToken field in the existing document
        await updateDoc(userRef, {
            fcmToken: token,
            lastTokenUpdate: new Date()
        });
        
        console.log('FCM token updated successfully');
    } catch (error) {
        console.error('Error storing FCM token:', error);
        // Don't throw the error, just log it to prevent interrupting the login flow
    }
}
