// Import necessary Firebase functions from the SDK
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";
import { getStorage, ref, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-storage.js";

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyDOtb-QtwEqIaWPYOjvGsS4HGycXhZ8eZw",
    authDomain: "myproject-9638b.firebaseapp.com",
    databaseURL: "https://myproject-9638b-default-rtdb.firebaseio.com",
    projectId: "myproject-9638b",
    storageBucket: "myproject-9638b.appspot.com",
    messagingSenderId: "419251176337",
    appId: "1:419251176337:web:2e33df046378ef6c651030"
};

const app = initializeApp(firebaseConfig); // Initialize Firebase
const auth = getAuth(app); // Initialize Auth
const db = getFirestore(app); // Initialize Firestore
const storage = getStorage(app); // Initialize Storage

// Import the initializeSignOut function from signout.js
import { initializeSignOut } from './signout.js';  // Adjust the path as needed

export async function loadSidebar() {
    try {
        const response = await fetch('sidebar.html');
        if (!response.ok) {
            throw new Error(`Error loading sidebar: ${response.statusText}`);
        }
        const html = await response.text();
        document.getElementById('sidebar-container').innerHTML = html;

        // Call the function to initialize the sign-out functionality
        initializeSignOut();

        // Listen for authentication state changes to get the user UID
        onAuthStateChanged(auth, async (user) => {
            if (user) {
                const userUid = user.uid; // Get the logged-in user's UID

                // Retrieve employer profile info from Firestore using the UID
                const employerRef = doc(db, 'employers', userUid); // Use UID as document ID
                const employerDoc = await getDoc(employerRef);

                if (employerDoc.exists()) {
                    const employerData = employerDoc.data();
                    const profilePicPath = employerData.profilePicture;

                    if (profilePicPath) {
                        // Retrieve the download URL from Firebase Storage
                        const profilePicRef = ref(storage, profilePicPath);
                        const profilePicUrl = await getDownloadURL(profilePicRef);

                        // Update the profile picture in the sidebar
                        const profileImage = document.getElementById('sidebar-profile-pic');
                        if (profileImage) {
                            profileImage.src = profilePicUrl;
                        }
                    } else {
                        console.log("No profile picture path found.");
                    }
                } else {
                    console.log("Employer profile does not exist.");
                }
            } else {
                console.log("No user is logged in.");
            }
        });
    } catch (error) {
        console.error('Error loading sidebar:', error);
        document.getElementById('sidebar-container').innerHTML = `<p>Error loading sidebar. Please try again later.</p>`;
    }
}
