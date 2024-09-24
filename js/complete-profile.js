import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-app.js";
import { getFirestore, doc, setDoc } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";
import { getAuth,  linkWithCredential, EmailAuthProvider } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js";

// Firebase config
const firebaseConfig = {
    apiKey: "AIzaSyDOtb-QtwEqIaWPYOjvGsS4HGycXhZ8eZw",
    authDomain: "myproject-9638b.firebaseapp.com",
    projectId: "myproject-9638b",
    storageBucket: "myproject-9638b.appspot.com",
    messagingSenderId: "419251176337",
    appId: "1:419251176337:web:2e33df046378ef6c651030"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore();
const auth = getAuth();

// Get email from URL query parameter and set it in the email field
const params = new URLSearchParams(window.location.search);
const userEmail = params.get('email');
document.getElementById('email').value = userEmail;

// Ensure email field is read-only
document.getElementById('email').readOnly = true;

// Handle form submission
const submit = document.getElementById('submit');
let isSubmitting = false; // Flag to track submission state

submit.addEventListener('click', async function (event) {
    event.preventDefault();

    // Prevent multiple submissions
    if (isSubmitting) {
        console.log("Submission already in progress. Please wait.");
        return;
    }

    isSubmitting = true; // Set the flag to true

    // Get input values
    const company_name = document.getElementById('company-name').value;
    const company_tel = document.getElementById('company-tel').value;
    const address_no = document.getElementById('no').value;
    const address_road = document.getElementById('road').value;
    const address_postcode = document.getElementById('postcode').value;
    const address_city = document.getElementById('city').value;
    const address_state = document.getElementById('state').value;
    const password = document.getElementById('new-password').value;
    const confirm_password = document.getElementById('confirm-password').value;

    // Validate form inputs
    if (!company_name || !company_tel || !address_no || !address_road || !address_postcode || !address_city || !address_state || !password || !confirm_password) {
        alert("All fields must be filled!");
        isSubmitting = false; // Reset the flag
        return;
    }

    if (!validate_password(password)) {
        isSubmitting = false; // Reset the flag
        return;
    }

    if (password !== confirm_password) {    
        alert("Passwords do not match!");
        isSubmitting = false; // Reset the flag
        return;
    }

    try {
        const user = auth.currentUser; // Get the current user who signed in with Google

        if (user) {
            const credential = EmailAuthProvider.credential(userEmail, password);
            // Link the Google account with the new email/password credentials
            await linkWithCredential(user, credential);

            // Data to store in Firestore
            const userData = {
                company_name: company_name,
                company_email: userEmail,
                company_tel: company_tel,
                address: {
                    no: address_no,
                    road: address_road,
                    postcode: address_postcode,
                    city: address_city,
                    state: address_state
                },
                last_updated: Date.now()
            };

            // Update user data in Firestore
            await setDoc(doc(db, 'employers', user.uid), userData);
            
            alert("Profile updated successfully!");
            window.location.href = "homepage.html";  // Redirect to homepage
        } else {
            alert("No user is currently signed in.");
        }

    } catch (error) {
        console.error("Error updating profile: ", error);
        alert("An error occurred while updating the profile.");
    } finally {
        isSubmitting = false; // Reset the flag after processing
    }
});

function validate_password(password) {
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{6,}$/;
    if (passwordRegex.test(password)) {
        return true;
    } else {
        alert('Invalid Password! Make sure to include:\n-at least one lowercase letter,\n-one uppercase letter,\n-one number,\n-one symbol,\nminimum length of 6 characters.');
        return false;
    }
}

const reset = document.getElementById('reset'); // Get the reset button
reset.addEventListener('click', function () {
    // Reset other fields
    document.getElementById('company-name').value = '';
    document.getElementById('company-tel').value = '';
    document.getElementById('no').value = '';
    document.getElementById('road').value = '';
    document.getElementById('postcode').value = '';
    document.getElementById('city').value = '';
    document.getElementById('state').value = '';
    document.getElementById('new-password').value = '';
    document.getElementById('confirm-password').value = '';
});
