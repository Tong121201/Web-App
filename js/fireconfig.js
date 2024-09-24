// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyDOtb-QtwEqIaWPYOjvGsS4HGycXhZ8eZw",
    authDomain: "myproject-9638b.firebaseapp.com",
    projectId: "myproject-9638b",
    storageBucket: "myproject-9638b.appspot.com",
    messagingSenderId: "419251176337",
    appId: "1:419251176337:web:2e33df046378ef6c651030"
};

// Initialize Firebase
const app = firebase.initializeApp(firebaseConfig);

// Initialize Variables
const auth = firebase.auth();
const database = firebase.database();

// Setup register function
function register(event) {
    event.preventDefault();  // Prevent form from submitting traditionally

    // Get all the input fields
    const company_name = document.getElementById('company-name').value;
    const company_email = document.getElementById('email').value;
    const company_tel = document.getElementById('company-tel').value;
    const address_no = document.getElementById('no').value;
    const address_road = document.getElementById('road').value;
    const address_postcode = document.getElementById('postcode').value;
    const address_city = document.getElementById('city').value;
    const address_state = document.getElementById('state').value;
    const username = document.getElementById('new-username').value;
    const password = document.getElementById('new-password').value;
    const confirm_password = document.getElementById('confirm-password').value;

    // Validate email and password
    if (!validate_email(company_email) || !validate_password(password)) {
        return;  // Stop if validation fails
    }

    // Check if passwords match
    if (password !== confirm_password) {
        alert("Passwords do not match!");
        return;
    }

    // Create user with Firebase Authentication
    auth.createUserWithEmailAndPassword(company_email, password)
    .then(function() {
        // Declare the user variable
        const user = auth.currentUser;

        // Add this user to the Firebase Database
        const database_ref = database.ref();

        // Create User data
        const user_data = {
            company_name: company_name,
            company_email: company_email,
            company_tel: company_tel,
            address_no: address_no,
            address_road: address_road,
            address_postcode: address_postcode,
            address_city: address_city,
            address_state: address_state,
            username: username,
            last_login: Date.now()
        };

        // Store the user data in the Firebase Realtime Database
        database_ref.child('users/' + user.uid).set(user_data)
        .then(() => {
            alert('User registration successful!');
        }).catch((error) => {
            console.error("Error saving user data:", error);
        });
    })
    .catch(function(error) {
        // Firebase will alert of any errors
        const error_message = error.message;
        alert(error_message);
    });
}

// Validation functions
function validate_email(email) {
    const expression = /^[^@]+@\w+(\.\w+)+\w$/;
    if (expression.test(email)) {
        return true;
    } else {
        alert('Invalid Email!!');
        return false;
    }
}

function validate_password(password) {
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9]).{6,}$/;
    if (passwordRegex.test(password)) {
        return true;
    } else {
        alert('Invalid Password! Make sure to include at least one lowercase letter, one uppercase letter, one number, and a minimum length of 6 characters.');
        return false;
    }
}
