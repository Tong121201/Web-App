// Import necessary Firebase functions from the SDK
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-app.js";
import { getFirestore, doc, updateDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-storage.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, updatePassword as firebaseUpdatePassword } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js";

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
const db = getFirestore(app); // Initialize Firestore
const storage = getStorage(app); // Initialize Storage
const auth = getAuth(app);


function selectProgram(program) {
    sessionStorage.setItem('selectedProgram', program); // Store program in session storage
    console.log("Selected Program: " + program); // Corrected the variable name to 'program'
    window.location.href = 'studentpage.html'; // Navigate to the student page
}
window.selectProgram = selectProgram;

// Function to load profile information
async function loadProfileInformation(uid) {
    const adminRef = doc(db, 'admins', uid); // Use the user's UID to access the correct document
    const docSnap = await getDoc(adminRef);
    
    if (docSnap.exists()) {
        const data = docSnap.data();

        // Load and display profile picture
        const profileImage = document.getElementById('profile-image');
        if (profileImage && data.profilePicture) {
            profileImage.src = data.profilePicture;
        }

        // Set fields
        updateProfileFields(data);
    } else {
        console.error("No such document!");
    }
}

// Function to update profile fields
function updateProfileFields(data) {
    const usernameInput = document.getElementById('username-text');
    const emailInput = document.getElementById('email');
    const fullnameInput = document.getElementById('fullname');
    const contactInput = document.getElementById('contact');

    // Set Username
    if (usernameInput) {
        usernameInput.value = data.username || ''; // Fallback to empty string
        document.getElementById('username-text').innerText = data.username || '';
    }

    // Set Email
    if (emailInput) {
        emailInput.value = data.email || ''; 
        document.getElementById('email-text').innerText = data.email || ''; 
        document.getElementById('email-display').innerText = data.email || ''; 
    }

    // Set Full Name
    if (fullnameInput) {
        fullnameInput.value = data.fullname || ''; 
        document.getElementById('fullname-text').innerText = data.fullname || ''; 
        document.getElementById('fullname-display').innerText = data.fullname || ''; 
    }

    // Set Contact Number
    if (contactInput) {
        contactInput.value = data.contact || ''; 
        document.getElementById('contact-text').innerText = data.contact || ''; 
    }
}

// On Auth State Change
onAuthStateChanged(auth, async (user) => {
    if (user) {
        console.log("User is logged in:", user.uid);
        await loadProfileInformation(user.uid); // Load profile information for the logged-in user
    } else {
        console.error("User is not logged in!");
    }
});

document.addEventListener('DOMContentLoaded', function () {
    const uploadImageLabel = document.querySelector('.change-photo');

    // Edit profile button click event
    document.getElementById('edit-profile').addEventListener('click', toggleEditMode);

    // Change password button click event
    document.getElementById('change-password-btn').addEventListener('click', toggleChangePassword);

    // Handle password visibility toggle
    setupPasswordVisibilityToggle();

    // Handle image upload
    document.getElementById('profile-upload').addEventListener('change', handleImageUpload);

    // Save profile information
    document.querySelector('.save-btn').addEventListener('click', saveProfileInformation);

    // Function to toggle edit mode
    function toggleEditMode() {
        const inputs = document.querySelectorAll('.form-control');
        const textFields = document.querySelectorAll('#email-text, #fullname-text, #contact-text');
        const saveButton = document.querySelector('.save-btn');

        inputs.forEach(input => input.classList.toggle('d-none'));
        textFields.forEach(text => text.classList.toggle('d-none'));
        saveButton.classList.toggle('d-none');

        const changePasswordBtn = document.getElementById('change-password-btn');
        changePasswordBtn.disabled = !saveButton.classList.contains('d-none'); // Enable if not in edit mode
    }

    // Function to toggle change password
    function toggleChangePassword() {
        const changePasswordContainer = document.getElementById('change-password-container');
        const saveButton = document.querySelector('.save-btn');

        if (saveButton.classList.contains('d-none')) {
            changePasswordContainer.classList.toggle('d-none');
            if (changePasswordContainer.classList.contains('d-none')) {
                resetPasswordFields();
            }
        }
    }

    // Set up password visibility toggle
    function setupPasswordVisibilityToggle() {
        const passwordInputs = [
            { input: document.getElementById('current-password'), button: document.getElementById('toggle-current-password') },
            { input: document.getElementById('new-password'), button: document.getElementById('toggle-new-password') },
            { input: document.getElementById('confirm-password'), button: document.getElementById('toggle-confirm-password') }
        ];

        passwordInputs.forEach(({ input, button }) => {
            button.addEventListener('click', () => togglePasswordVisibility(input, button));
        });
    }

    // Function to toggle password visibility
    function togglePasswordVisibility(input, toggleButton) {
        const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
        input.setAttribute('type', type);
        toggleButton.textContent = type === 'password' ? '👁️' : '🙈';
    }

    // Function to reset password fields
    function resetPasswordFields() {
        document.getElementById('current-password').value = '';
        document.getElementById('new-password').value = '';
        document.getElementById('confirm-password').value = '';
    }

    // Function to handle image upload
    async function handleImageUpload(event) {
        const file = event.target.files[0];
        if (file) {
            try {
                const storageRef = ref(storage, `admin/profile-pictures/${file.name}`);
                await uploadBytes(storageRef, file);
                const url = await getDownloadURL(storageRef);

                // Update Firestore with the new image URL
                const adminRef = doc(db, 'admins', auth.currentUser.uid);
                await updateDoc(adminRef, { profilePicture: url });

                // Update the profile image displayed
                document.getElementById('profile-image').src = url;

                alert("Profile picture updated successfully!");
            } catch (error) {
                console.error("Error uploading image: ", error);
            }
        }
    }

    // Function to save profile information
    async function saveProfileInformation(event) {
        event.preventDefault();

        const emailInput = document.getElementById('email');
        const fullnameInput = document.getElementById('fullname');
        const contactInput = document.getElementById('contact');

        const email = emailInput.value;
        const fullname = fullnameInput.value;
        const contact = contactInput.value;

        try {
            const adminRef = doc(db, 'admins', auth.currentUser.uid);
            await updateDoc(adminRef, {
                email: email,
                fullname: fullname,
                contact: contact
            });

            alert("Profile information updated successfully!");
            loadProfileInformation(auth.currentUser.uid); // Reload updated profile information

            toggleEditMode(); // Call toggleEditMode to re-enable input fields after save

            const changePasswordBtn = document.getElementById('change-password-btn');
            if (changePasswordBtn) {
                changePasswordBtn.disabled = false; // Enable the change password button
            }

        } catch (error) {
            console.error("Error saving profile information: ", error);
        }
    }

        // Function to validate the password based on rules
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

// Function to check all validations
function checkAllValidations() {
    const currentPasswordInput = document.getElementById('current-password');
    const newPasswordInput = document.getElementById('new-password');
    const confirmPasswordInput = document.getElementById('confirm-password');

    const currentPassword = currentPasswordInput.value;
    const newPassword = newPasswordInput.value;
    const confirmPassword = confirmPasswordInput.value;

    if (newPassword !== confirmPassword) {
        alert("New password and confirm password do not match.");
        return false; // Validation failed
    }

    if (newPassword === currentPassword) {
        alert("The new password cannot be the same as the current password.");
        return false; // Validation failed
    }

    if (!validate_password(newPassword)) {
        return false; // Validation failed
    }

    return true; // All validations passed
}

// Function to update the password
async function updatePassword() {
    const currentPasswordInput = document.getElementById('current-password');
    const newPasswordInput = document.getElementById('new-password');
    const confirmPasswordInput = document.getElementById('confirm-password');

    const currentPassword = currentPasswordInput.value;
    const newPassword = newPasswordInput.value;

    // First, check all validations
    if (!checkAllValidations()) {
        return; // Exit if validation fails
    }

    try {
        const user = auth.currentUser;
        if (!user) {
            alert("No user is currently signed in.");
            return;
        }

        console.log("Attempting to re-authenticate with:", user.email);
        // Re-authenticate user
        await signInWithEmailAndPassword(auth, user.email, currentPassword);

        // If re-authentication succeeds, update the password
        await firebaseUpdatePassword(user, newPassword);
        alert("Password updated successfully!");

        // Re-authenticate with the new password to keep the session
        await signInWithEmailAndPassword(auth, user.email, newPassword);
        resetPasswordFields();
    } catch (error) {
        console.error("Error updating password: ", error);

        if (error.code === 'auth/wrong-password') {
            alert("The current password you entered is incorrect. Please try again.");
        } else if (error.code === 'auth/invalid-credential') {
            alert("The current password you entered is incorrect. Please try again.");
        } else {
            alert("Error updating password: " + error.message);
        }
    }
}

    // Handle the change password submission
    document.querySelector('.update-password-btn').addEventListener('click', async (event) => {
        event.preventDefault();
        await updatePassword();
    });
});
