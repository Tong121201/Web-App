// Import necessary Firebase functions from the SDK
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-app.js";
import { getFirestore, doc, updateDoc, getDoc,setDoc } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";
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

// Function to load profile information
async function loadProfileInformation(uid) {
    const adminRef = doc(db, 'employers', uid); // Use the user's UID to access the correct document
    const docSnap = await getDoc(adminRef);
    
    if (docSnap.exists()) {
        const data = docSnap.data();

        // Load and display profile picture
        const profileImage = document.getElementById('profile-image');
        if (profileImage && data.profilePicture) {
            profileImage.src = data.profilePicture;
        }
        // Set fields
        updateEmployerProfileFields(data);
    } else {
        console.error("No such document!");
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

// Function to update employer profile fields
function updateEmployerProfileFields(data) {
    const companyNameInput = document.getElementById('company-name');
    const emailInput = document.getElementById('email');
    const contactInput = document.getElementById('contact');
    const noInput = document.getElementById('no');
    const roadInput = document.getElementById('road');
    const postcodeInput = document.getElementById('postcode');
    const cityInput = document.getElementById('city');
    const stateInput = document.getElementById('state');

    // Set Company Name
    if (companyNameInput) {
        companyNameInput.value = data.company_name || ''; // Fallback to empty string
        document.getElementById('company-name-text').innerText = data.company_name || '';
        document.getElementById('company-name-display').innerText = data.company_name || '';
    }

    // Set Company Email
    if (emailInput) {
        emailInput.value = data.company_email || ''; 
        document.getElementById('email-display').innerText = data.company_email || ''; 
        document.getElementById('email-text').innerText = data.company_email || ''; 
    }

    // Set Company Contact Number
    if (contactInput) {
        contactInput.value = data.company_tel || ''; 
        document.getElementById('contact-text').innerText = data.company_tel || ''; 
    }

    // Set Address Information
    if (data.address) {
        // Set Address Components
        noInput.value = data.address.no || '';
        document.getElementById('no-text').innerText = data.address.no || '';
        
        roadInput.value = data.address.road || '';
        document.getElementById('road-text').innerText = data.address.road || '';
        
        postcodeInput.value = data.address.postcode || '';
        document.getElementById('postcode-text').innerText = data.address.postcode || '';
        
        cityInput.value = data.address.city || '';
        document.getElementById('city-text').innerText = data.address.city || '';
        
        stateInput.value = data.address.state || '';
        document.getElementById('state-text').innerText = data.address.state || '';
    }
}


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
        const textFields = document.querySelectorAll('#company-name-text, #email-text, #contact-text,#no-text, #road-text, #postcode-text, #city-text, #state-text');
        const saveButton = document.querySelector('.save-btn');
        const addressDisplay = document.getElementById('address-display');

        inputs.forEach(input => input.classList.toggle('d-none'));
        textFields.forEach(text => text.classList.toggle('d-none'));
        saveButton.classList.toggle('d-none');

        // Toggle edit mode class to hide separators
        addressDisplay.classList.toggle('edit-mode');

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
                // Get the current user's UID
                const employerId = auth.currentUser.uid;

                // Reference to Firebase Storage with employer ID in the path
                const storageRef = ref(storage, `employers/profile-pictures/${employerId}/${file.name}`);
                await uploadBytes(storageRef, file);

                // Get the download URL
                const url = await getDownloadURL(storageRef);

                // Firestore reference to the employer document
                const employerRef = doc(db, 'employers', employerId);

                // Check if document exists
                const docSnapshot = await getDoc(employerRef);

                if (docSnapshot.exists()) {
                    // Update document with profile picture URL if it exists
                    await updateDoc(employerRef, { profilePicture: url });
                } else {
                    // Create document with profile picture URL if it doesn't exist
                    await setDoc(employerRef, { profilePicture: url });
                }

                // Update the profile image displayed on the page
                document.getElementById('profile-image').src = url;

                alert("Profile picture updated successfully!");
            } catch (error) {
                console.error("Error uploading image: ", error);
                alert("Failed to upload profile picture. Please try again.");
            }
        }
    }



    // Function to save employer profile information
    async function saveProfileInformation(event) {
        event.preventDefault();

        const companyNameInput = document.getElementById('company-name');
        const emailInput = document.getElementById('email');
        const contactInput = document.getElementById('contact');
        const noInput = document.getElementById('no');
        const roadInput = document.getElementById('road');
        const postcodeInput = document.getElementById('postcode');
        const cityInput = document.getElementById('city');
        const stateInput = document.getElementById('state');

        const companyName = companyNameInput.value;
        const email = emailInput.value;
        const contact = contactInput.value;
        const address = {
            no: noInput.value,
            road: roadInput.value,
            postcode: postcodeInput.value,
            city: cityInput.value,
            state: stateInput.value,
        };

        try {
            const adminRef = doc(db, 'employers', auth.currentUser.uid);
            await updateDoc(adminRef, {
                company_name: companyName,
                company_email: email,
                company_tel: contact,
                address: address // Update address object
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
