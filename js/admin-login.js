// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";

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
const db = getFirestore(app);

// Function to handle admin login
async function handleAdminLogin(event) {
  event.preventDefault(); // Prevent form from submitting the default way

  const username = document.getElementById('admin-username').value;
  const password = document.getElementById('admin-password').value;

  try {
    // Retrieve the admin credentials from Firestore
    const docRef = doc(db, 'admin', 'admin01');
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      const storedUsername = data.username;
      const storedPasswordHash = data.password;

      // Check if the input username matches
      if (username === storedUsername) {
        // Here you would compare hashed passwords. Assuming you have the hashed password for comparison.
        // If using plain text for demo purposes only
        if (password === storedPasswordHash) {
          alert('Login successful!');
          // Redirect to admin dashboard or another page
          window.location.href = 'adminhome.html';
        } else {
          alert('Invalid password');
        }
      } else {
        alert('Invalid username');
      }
    } else {
      alert('No admin credentials found');
    }
  } catch (error) {
    console.error('Error logging in:', error);
    alert('Error logging in. Please try again later.');
  }
}

// Attach event listener to the form
document.querySelector('form').addEventListener('submit', handleAdminLogin);

const passwordInput = document.getElementById('admin-password');
const togglePassword = document.getElementById('toggle-password');
togglePassword.addEventListener('click', () => {
    // Toggle the password visibility
    const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
    passwordInput.setAttribute('type', type);
    
    // Change the icon based on the visibility
    togglePassword.textContent = type === 'password' ? '👁️' : '🙈';
});