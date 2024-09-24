// Import the necessary functions from Firebase SDK
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-app.js";
import { getAuth, confirmPasswordReset } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js";

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

// Function to validate password based on rules
function validate_password(password) {
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*()_+{}\[\]:;"'<>,.?~\\/-]).{6,}$/;
    
    if (passwordRegex.test(password)) {
        return true; // Password meets the requirements
    } else {
        // Detailed alert message
        alert(
            'Invalid Password!\n' +
            'Your password must meet the following criteria:\n' +
            '- At least one lowercase letter (a-z)\n' +
            '- At least one uppercase letter (A-Z)\n' +
            '- At least one number (0-9)\n' +
            '- At least one symbol (e.g., !@#$%^&*()_+{}[]:;\'",.<>?/~\\-)\n' +
            '- Minimum length of 6 characters\n' +
            'Please try again.'
        );
        return false; // Password does not meet the requirements
    }
}

// Toggle password visibility
function setupPasswordToggles() {
    const toggleNewPassword = document.getElementById('toggle-new-password');
    const newPasswordInput = document.getElementById('new-password');
    
    const toggleConfirmPassword = document.getElementById('toggle-confirm-password');
    const confirmPasswordInput = document.getElementById('confirm-password');

    toggleNewPassword.addEventListener('click', () => {
        const type = newPasswordInput.type === 'password' ? 'text' : 'password';
        newPasswordInput.type = type;
        toggleNewPassword.textContent = type === 'password' ? '👁️' : '🙈';
    });

    toggleConfirmPassword.addEventListener('click', () => {
        const type = confirmPasswordInput.type === 'password' ? 'text' : 'password';
        confirmPasswordInput.type = type;
        toggleConfirmPassword.textContent = type === 'password' ? '👁️' : '🙈';
    });
}

// Initialize the toggle functionality
setupPasswordToggles();

// Event listener for form submission
document.getElementById('reset-password-form').addEventListener('submit', async function (event) {
    event.preventDefault();

    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;

    if (newPassword !== confirmPassword) {
        alert('Passwords do not match.');
    } else if (!validate_password(newPassword)) {
        // Password validation failed, message already shown in validate_password
    } else {
        const urlParams = new URLSearchParams(window.location.search);
        const oobCode = urlParams.get('oobCode');

        try {
            await confirmPasswordReset(auth, oobCode, newPassword);
            alert('Password has been reset successfully.');
            window.close();
            //window.location.href = 'login.html';
        } catch (error) {
            alert(error.message);
        }
    }
});
