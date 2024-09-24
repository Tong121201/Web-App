    // Import the functions you need from the SDKs you need
    import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-app.js";
    import { getAuth, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js";
    import { getFirestore, doc, setDoc, getDocs, collection, query, where } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";

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
    const auth = getAuth();
    const db = getFirestore();

    // Submit button
    const submit = document.getElementById('submit');
    let isSubmitting = false; // Flag to track submission state

    submit.addEventListener("click", async function(event) {
        event.preventDefault();  // Prevent form from submitting traditionally

        // Prevent multiple submissions
        if (isSubmitting) {
            console.log("Submission already in progress. Please wait.");
            return;
        }

        isSubmitting = true; // Set the flag to true
        submit.disabled = true; // Disable the button

        try {
            // Get all the input fields
            const company_name = document.getElementById('company-name').value;
            const company_email = document.getElementById('email').value;
            const company_tel = document.getElementById('company-tel').value;
            const address_no = document.getElementById('no').value;
            const address_road = document.getElementById('road').value;
            const address_postcode = document.getElementById('postcode').value;
            const address_city = document.getElementById('city').value;
            const address_state = document.getElementById('state').value;
            //const username = document.getElementById('new-username').value;
            const password = document.getElementById('new-password').value;
            const confirm_password = document.getElementById('confirm-password').value;

            // Check if any fields are empty
            if (!company_name || !company_email || !company_tel || !address_no || !address_road || !address_postcode || !address_city || !address_state || !password || !confirm_password) {
                alert("All fields must be filled out!");
                return;
            }

        /*
            const usernameUsed = await checkIfUsernameUsed(username);
            if (usernameUsed) {
                alert("Username is already taken!");
                return;
            }
        */  
            
            // Check if email is already registered
            const emailUsed = await checkIfEmailUsed(company_email);
            if (emailUsed) {
                alert("Email is already registered!");
                return;
            }

            // Check if company_tel is a number
            if (!/^\d+$/.test(company_tel)) {
                alert("Company telephone must contain only numbers! Remove the (-) ");
                return;
            }

            // Check if postcode is exactly 5 digits
            if (!/^\d{5}$/.test(address_postcode)) {
                alert("Postcode must be exactly 5 digits!");
                return;
            }

            // Validate email, password, and additional checks
            if (!validate_email(company_email) || !validate_password(password)) {
                return;
            }

            // Check if passwords match
            if (password !== confirm_password) {
                alert("Passwords do not match!");
                return;
            }

            // Create user with Firebase Authentication
            const userCredential = await createUserWithEmailAndPassword(auth, company_email, password);
            const user = userCredential.user;

            const user_data = {
                company_name: company_name,
                company_email: company_email,
                company_tel: company_tel,
                address: {
                    no: address_no,
                    road: address_road,
                    postcode: address_postcode,
                    city: address_city,
                    state: address_state
                },
                //username: username,
                last_login: Date.now()
            };

            // Store the user data in Firestore
            await setDoc(doc(db, 'employers', user.uid), user_data);

            alert('User registration successful!');
            window.location.href = "loginpage.html";

            // Clear form fields after successful registration
            document.getElementById('company-name').value = '';
            document.getElementById('email').value = '';
            document.getElementById('company-tel').value = '';
            document.getElementById('no').value = '';
            document.getElementById('road').value = '';
            document.getElementById('postcode').value = '';
            document.getElementById('city').value = '';
            document.getElementById('state').value = '';
            //document.getElementById('new-username').value = '';
            document.getElementById('new-password').value = '';
            document.getElementById('confirm-password').value = '';

        } catch (error) {
            if (error.code === 'auth/email-already-in-use') {
                alert("Email is already registered!");  // Custom alert for duplicate email
            } else {
                const error_message = error.message;
                alert(error_message);  // Other errors
            }
        } finally {
            isSubmitting = false; // Reset the flag 
            submit.disabled = false; // Re-enable the button
        }
    });

    // Validation functions
    function validate_email(email) {
        const expression = /^[^@]+@\w+(\.\w+)+\w$/;
        if (expression.test(email)) {
            return true;
        } else {
            alert('Invalid Email!');
            return false;
        }
    }

    function validate_password(password) {
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{6,}$/;
        if (passwordRegex.test(password)) {
            return true;
        } else {
            alert('Invalid Password! Make sure to include:\n-at least one lowercase letter,\n-one uppercase letter,\n-one number,\n-one symbol,\nminimum length of 6 characters.');
            return false;
        }
    }


    // Function to check if email is already registered
    async function checkIfEmailUsed(email) {
        const q = query(collection(db, "employers"), where("company_email", "==", email));
        const querySnapshot = await getDocs(q);
        return !querySnapshot.empty;  // Returns true if email exists
    }

    /*
        // Function to check if username is already taken
        async function checkIfUsernameUsed(username) {
            const q = query(collection(db, "employers"), where("username", "==", username));
            const querySnapshot = await getDocs(q);
            return !querySnapshot.empty;  // Returns true if username exists
        }
    */