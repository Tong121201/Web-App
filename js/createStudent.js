// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-app.js";
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

// Initialize Firestore
const db = getFirestore(app);


const submit = document.getElementById('submit');
submit.addEventListener('click', async function() {
    const formMode = document.getElementById('form-mode').value;
    const studentName = document.getElementById('student-Name').value;
    const studentId = document.getElementById('student-Id').value;
    const email = document.getElementById('student-email').value;
    const contact = document.getElementById('student-contact').value;
    const no = document.getElementById('address-no').value;
    const road = document.getElementById('address-road').value;
    const postcode = document.getElementById('address-postcode').value;
    const city = document.getElementById('address-city').value;
    const state = document.getElementById('address-state').value;
    const program = document.getElementById('student-program').value;
    const nationality = document.getElementById('student-nationality').value;
    const gender = document.getElementById('student-gender').value;
   

    // Validate the form
    if (!validateForm(studentName, studentId, email, contact, no, road, postcode, city, state, program)) {
        return;
    }

    try {
        if (formMode === 'create') {
            const emailQuery = query(collection(db, "allStudents"), where("email", "==", email));
            const emailSnapshot = await getDocs(emailQuery);
    
            if (!emailSnapshot.empty) {
                alert("The email is already in use. Please use a different email.");
                return; // Exit without creating the record
            }
        
        
         // Reference to the 'students' collection (program-based)
         const studentsRef = collection(db, "students");
         const programDocRef = doc(studentsRef, program);
         const studentRef = doc(collection(programDocRef, "students"), studentId);

        // Add student data
        await setDoc(studentRef, {
            studentName: studentName,
            studentId: studentId,
            email: email,
            contact: contact,
            gender: gender,
            nationality: nationality,
            program: program,
            address: { no, road, postcode, city, state },
            internshipCompany: "",
            resume: "",
            placementLetter: "",
            skills : "",
            internshipStatus: "Pending", // default status
            profilePic : "",
            enrollmentDate: new Date(), // You can include other relevant data if needed
        });

        // Add student reference to global 'allStudents' collection
        const allStudentsRef = doc(collection(db, "allStudents"), studentId);
        await setDoc(allStudentsRef, {
            studentId: studentId,
            name: studentName,
            email: email,
            currentProgram: program,
            programReference: `students/${program}/students/${studentId}`,
        });

        // Optionally, update the program document with some metadata
        await setDoc(programDocRef, {
            programName: program,
        }, { merge: true });

        alert("Student created successfully!");

        document.getElementById('studentForm').reset(); // Resets the form

        
        $('#createStudentModal').modal('hide');
    }
    } catch (error) {
        console.error("Error creating student record: ", error);
    }
});

// Form Validation
function validateForm(name, id, email, contact, no, road, postcode, city, state, program) {
    // Check all required fields
    if (!name || !id || !email || !contact || !no || !road || !postcode || !city || !state || !program) {
        alert("Please fill all required fields.");
        return false;
    }

    // Email validation
    const emailRegex = /^[a-zA-Z0-9._%+-]+@qiu\.edu\.my$/;
    if (!emailRegex.test(email)) {
        alert("Please enter a valid QIU email.");
        return false;
    }

    // Contact validation (only digits allowed)
    const contactRegex = /^[0-9]+$/;
    if (!contactRegex.test(contact)) {
        alert("Contact number must contain only digits.");
        return false;
    }

    // Postcode validation (5 digits)
    const postcodeRegex = /^[0-9]{5}$/;
    if (!postcodeRegex.test(postcode)) {
        alert("Postcode must be 5 digits.");
        return false;
    }

    return true;
}