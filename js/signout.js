// Import the necessary functions from Firebase SDK
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-app.js";
import { getAuth, signOut } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js";

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

// Initialize Firebase Auth
const auth = getAuth(app);

// Function to clear all local storage data
const clearAllLocalStorage = () => {
    try {
        // Clear all localStorage items
        localStorage.clear();
        
        // Clear all sessionStorage items
        sessionStorage.clear();
        
        // Clear specific items if needed
        localStorage.removeItem('loggedInUserId');
        localStorage.removeItem('userRole');
        localStorage.removeItem('userPreferences');
        // Add any other specific items you want to ensure are removed
        
        console.log('All local storage data cleared successfully');
    } catch (error) {
        console.error('Error clearing local storage:', error);
    }
};

// Export a function to initialize sign-out functionality
export function initializeSignOut() {
    const signoutButton = document.getElementById('sign-out');
    
    if (signoutButton) {
        signoutButton.addEventListener("click", () => {
            // First clear all local storage
            clearAllLocalStorage();
            
            // Then sign out from Firebase
            signOut(auth)
                .then(() => {
                    // Double check that storage is cleared after successful sign out
                    clearAllLocalStorage();
                    
                    // Redirect to login page
                    window.location.href = "loginpage.html";
                    alert('Logout Successful');
                })
                .catch((error) => {
                    console.error('Error Signing out:', error);
                    alert('Error during sign out. Please try again.');
                })
                .finally(() => {
                    // One final check to ensure everything is cleared
                    clearAllLocalStorage();
                });
        });
    } else {
        console.error("Sign-out button not found.");
    }
}