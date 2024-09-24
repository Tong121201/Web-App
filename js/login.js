// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";


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


// Password toggle functionality
const togglePasswordBtn = document.getElementById('toggle-password');
const passwordInput = document.getElementById('password');

togglePasswordBtn.addEventListener('click', () => {
    const type = passwordInput.type === 'password' ? 'text' : 'password';
    passwordInput.type = type;
    togglePasswordBtn.textContent = type === 'password' ? '👁️' : '🙈';
});


// Submit button
const submit = document.getElementById('submit');
let isSubmitting = false; // Flag to track submission state

submit.addEventListener("click", (event) => {
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

        signInWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            alert('Login Successful');
            const user = userCredential.user;
            localStorage.setItem('loggedInUserId', user.uid);
            window.location.href="homepage.html";

        })
        .catch((error)=>{   
            const errorCode = error.code;
            if(errorCode === 'auth/invalid-credential'){
                alert('Incorrect Email or Password!');
            }else{
                alert('Account does not exist!');
            }
        })
    
    } catch (error) {
        const error_message = error.message;
        alert(error_message);  // Display error message
    } finally {
        isSubmitting = false; // Reset the flag
        submit.disabled = false; // Re-enable the button
    }
});

// Initialize Firestore
const db = getFirestore(app);

// Google Login
const googleLoginBtn = document.getElementById('google-btn');
googleLoginBtn.addEventListener('click', function(event) {
    event.preventDefault();

    signInWithPopup(auth, googleProvider)
    .then((result) => {
        const user = result.user;

        // Reference the Firestore collection and document
        const userRef = doc(db, 'employers', user.uid);

        getDoc(userRef).then((docSnapshot) => {
            if (docSnapshot.exists()) {
                // User already exists, proceed to the homepage
                localStorage.setItem('loggedInUserId', user.uid);
                window.location.href = "homepage.html";
            } else {      
                    window.location.href = "complete-profile.html?email=" + encodeURIComponent(user.email);
            }
        }).catch((error) => {
            console.error("Error checking user existence:", error);
        });

    }).catch((error) => {
        const errorCode = error.code;
        const errorMessage = error.message;
        console.error("Error during Google login:", errorCode, errorMessage);
    });
});


const resetLink = document.getElementById('reset');
const popupContainer = document.getElementById('popup-container');
const closePopupBtn = document.getElementById('close-popup');
const resetEmailInput = document.getElementById('reset-email');
const resetForm = popupContainer.querySelector('form');

// Show the pop-up when "Forgot Password?" is clicked
resetLink.addEventListener('click', (e) => {
    e.preventDefault();
    popupContainer.style.display = 'flex';
});

// Hide the pop-up when the close button is clicked
closePopupBtn.addEventListener('click', () => {
    popupContainer.style.display = 'none';
});

// Optionally, close the pop-up if the user clicks outside the pop-up
popupContainer.addEventListener('click', (e) => {
    if (e.target === popupContainer) {
        popupContainer.style.display = 'none';
    }
});

// Handle password reset form submission
resetForm.addEventListener('submit', (event) => {
    event.preventDefault();

    const email = resetEmailInput.value;

    sendPasswordResetEmail(auth, email)
        .then(() => {
            alert("Check your email for password reset instructions.");
            popupContainer.style.display = 'none';  // Close the popup after submission
        })
        .catch((error) => {
            const errorMessage = error.message;
            alert(errorMessage);
        });
});
