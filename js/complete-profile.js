import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-app.js";
import { getFirestore, doc, setDoc, getDocs, collection, updateDoc, arrayUnion } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";
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

// Function to send notification to admin
async function notifyAdmin(employerData) {
    try {
        // Get all admin documents
        const adminsSnapshot = await getDocs(collection(db, 'admins'));
        
        // For each admin, send a notification
        for (const adminDoc of adminsSnapshot.docs) {
            const adminData = adminDoc.data();
            const deviceToken = adminData.fcmToken;
            
            if (deviceToken) {
                console.log('Admin Device Token:', deviceToken);

                // Prepare notification content
                const notificationTitle = 'New Employer Registration';
                const notificationBody = `${employerData.company_name} has registered as a new employer`;

                console.log('Sending notification with payload:', {
                    token: deviceToken,
                    title: notificationTitle,
                    body: notificationBody
                });

                // Send notification
                const response = await fetch('http://localhost:3000/send-notification', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        token: deviceToken,
                        title: notificationTitle,
                        body: notificationBody,
                        data: {
                            type: 'new_employer_registration',
                            employerId: auth.currentUser.uid,
                            companyName: employerData.company_name,
                            companyEmail: employerData.company_email
                        }
                    })
                });

                const responseData = await response.json();
                console.log('Notification server response:', responseData);

                if (!response.ok) {
                    throw new Error(`Notification server error: ${JSON.stringify(responseData)}`);
                }

                // Store notification in admin's document using arrayUnion
                const adminRef = doc(db, 'admins', adminDoc.id);
                await updateDoc(adminRef, {
                    notifications: arrayUnion({
                        title: notificationTitle,
                        body: notificationBody,
                        type: 'new_employer_registration',
                        employerId: auth.currentUser.uid,
                        companyName: employerData.company_name,
                        companyEmail: employerData.company_email,
                        createdAt: new Date().toISOString(),
                        read: false
                    })
                });

                console.log('Notification sent and stored successfully for admin:', adminDoc.id);
            } else {
                console.log('No device token found for admin:', adminDoc.id);
            }
        }
    } catch (error) {
        console.error('Error in notifyAdmin:', error);
        // Log the full error details for debugging
        console.error('Error details:', {
            message: error.message,
            stack: error.stack,
            cause: error.cause
        });
    }
}

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
                hiredNumber: 0,
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
            
            // Send notification to admin
            await notifyAdmin(userData);
            
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