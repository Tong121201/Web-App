// Import the necessary Firebase functions from the SDK
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-app.js";
import { getFirestore,  doc, setDoc, getDocs, collection, getDoc, deleteDoc, query, where, updateDoc } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";
import { getStorage, listAll, ref, uploadBytes, getDownloadURL, deleteObject } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-storage.js";

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


const app = initializeApp(firebaseConfig); // Initialize Firebase
const db = getFirestore(app); // Initialize Firestore
const storage = getStorage(app); // Initialize Firebase Storage


// This function will run when the page loads
window.onload = function() {
    loadSelectedProgram(); // Load the selected program and display it
};

// Function to store the selected program in session storage
function selectProgram(program) {
    sessionStorage.removeItem('selectedProgram'); // Clear the previous selected program from session storage
    sessionStorage.setItem('selectedProgram', program); // Store the selected program
    console.log("Selected Program: " + program);
    document.getElementById('program-display').innerText = program; // Update the displayed program name
    retrieveStudentData(program); // Retrieve and display student data for the selected program
}

// Function to load the selected program on page load and display it
function loadSelectedProgram() {
    const selectedProgram = sessionStorage.getItem('selectedProgram'); // Retrieve stored program
    if (selectedProgram) {
        document.getElementById('program-display').innerText = selectedProgram; // Display stored program
        // Retrieve and display student data based on the selected program
        retrieveStudentData(selectedProgram);
    }
}

window.selectProgram = selectProgram;


// Function to open the modal for creating a new student
function createStudent() {
    resetFormToCreateMode();
    $('#createStudentModal').modal('show'); // Show the Bootstrap modal for creating a student
}
window.createStudent = createStudent; // Attach the function to the window object

// Function to upload file to Firebase Storage
async function uploadFile(file, path) {
    try {
      const storageRef = ref(storage, path);
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);
      console.log("File available at", downloadURL);
      return downloadURL;
    } catch (error) {
      console.error("Error uploading file:", error);

    }
}

// Attach the function to the form submit event
document.getElementById('studentForm').addEventListener('submit', handleCreateStudent);
// Function to handle form submission
async function handleCreateStudent(e) {
    e.preventDefault();

    // Collect form data
    const formMode = document.getElementById('form-mode').value;
    const studentName = document.getElementById('student-Name').value;
    const studentId = document.getElementById('student-Id').value;
    const email = document.getElementById('student-email').value;
    const contact = document.getElementById('student-contact').value;
    const gender = document.getElementById('student-gender').value;
    const nationality = document.getElementById('student-nationality').value;
    const program = document.getElementById('student-program').value;
    const no = document.getElementById('address-no').value;
    const road = document.getElementById('address-road').value;
    const postcode = document.getElementById('address-postcode').value;
    const city = document.getElementById('address-city').value;
    const state = document.getElementById('address-state').value;
    const internshipStatus = document.getElementById('internship-Status').value;

    // Validate the form
    if (!validateForm(studentName, studentId, email, contact, no, road, postcode, city, state, program)) {
        return;
    }

    try {
        if (formMode === 'create') {
            // Check if email already exists
            const emailQuery = query(collection(db, "allStudents"), where("email", "==", email));
            const emailSnapshot = await getDocs(emailQuery);

            if (!emailSnapshot.empty) {
                alert("The email is already in use. Please use a different email.");
                return;
            }

            // Handle file uploads
            const resumeFile = document.getElementById('student-resume').files[0];
            const placementLetterFile = document.getElementById('student-placementLetter').files[0];

            let resumeUrl = "";
            let placementLetterUrl = "";

            if (resumeFile) {
                const resumeUploadPath = `resumes/${studentId}/${resumeFile.name}`;
                resumeUrl = await uploadFile(resumeFile, resumeUploadPath);
            }

            if (placementLetterFile) {
                const placementLetterUploadPath = `placementLetters/${studentId}/${placementLetterFile.name}`;
                placementLetterUrl = await uploadFile(placementLetterFile, placementLetterUploadPath);
            }

            // Create student data object
            const studentData = {
                studentName,
                studentId,
                email,
                contact,
                gender,
                nationality,
                program,
                address: { no, road, postcode, city, state },
                internshipCompany: "",
                resume: resumeUrl,
                placementLetter: placementLetterUrl,
                skills: "",
                profilePic: "",
                internshipStatus,
                enrollmentDate: new Date()
            };

            // Add student to program-specific collection
            const studentsRef = collection(db, "students");
            const programDocRef = doc(studentsRef, program);
            const studentRef = doc(collection(programDocRef, "students"), studentId);
            await setDoc(studentRef, studentData);
            
            // Add student reference to global 'allStudents' collection
            const allStudentsRef = doc(collection(db, "allStudents"), studentId);
            await setDoc(allStudentsRef, {
                studentId,
                name: studentName,
                email,
                currentProgram: program,
                programReference: `students/${program}/students/${studentId}`
            });

           
            // Reference to the 'email' collection
            const emailsRef = collection(db, "email");
            const emailDocRef = doc(emailsRef, email);  // Use email as the document ID
            // Set the studentId inside the document
            await setDoc(emailDocRef, {
                studentId: studentId,  // Store studentId in the email document
                email: email
            });

            alert("Student created successfully!");
            $('#createStudentModal').modal('hide');
            document.getElementById('studentForm').reset();
            
            // Refresh the student data display
            const selectedProgram = sessionStorage.getItem('selectedProgram');
            retrieveStudentData(selectedProgram);
        }
    } catch (error) {
        console.error("Error creating student record: ", error);
        alert("An error occurred while creating the student record. Please try again.");
    }
}

async function retrieveStudentData(program) {
    try {
        // Reference to the specific program document
        const programDocRef = doc(db, "students", program);
        
        // Reference to the students subcollection
        const studentsCollectionRef = collection(programDocRef, "students");
        
        // Get all students from the subcollection
        const studentSnapshot = await getDocs(studentsCollectionRef);
        
        // Clear existing table rows
        const tableBody = document.querySelector('#student_table tbody');
        tableBody.innerHTML = '';

        if (studentSnapshot.empty) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="13" class="text-center">No data available for the selected program.</td>
                </tr>
            `;
            return;
        }

        const rows = [];
        for (const docSnapshot of studentSnapshot.docs) {
            const studentData = docSnapshot.data();
            const allStudentDocRef = doc(db, "allStudents", docSnapshot.id);
            const allStudentDoc = await getDoc(allStudentDocRef);
            
            if (allStudentDoc.exists()) {
                const allStudentData = allStudentDoc.data();

                const row = {
                    name: allStudentData.name || "N/A",
                    studentId: allStudentData.studentId || "N/A",
                    email: allStudentData.email || "N/A",
                    contact: studentData.contact || "N/A",
                    program: allStudentData.currentProgram || "N/A",
                    gender: studentData.gender || "N/A",
                    nationality: studentData.nationality || "N/A",
                    address: studentData.address ? `${studentData.address.no}, ${studentData.address.road}, ${studentData.address.city}, ${studentData.address.state}` : "N/A",
                    resume: studentData.resume
                    ? `<a href="${studentData.resume}" target="_blank" class="download-button"><i class="bi bi-file-earmark-arrow-down-fill"></i></a>`
                    : "Not Uploaded",
                    placementLetter: studentData.placementLetter
                    ? `<a href="${studentData.placementLetter}" target="_blank" class="download-button"><i class="bi bi-file-earmark-arrow-down-fill"></i></a>`
                    : "Not Uploaded",
                    internshipComp: studentData.internshipCompany || "N/A",
                    internshipStatus: studentData.internshipStatus || "N/A",
                    action: `
                        <div class="btn-group" role="group">
                            <button type="button" class="btn btn-primary btn-sm action-button" 
                                onclick="updateStudent('${docSnapshot.id}', '${program}')"
                                title="Edit Student">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button type="button" class="btn btn-danger btn-sm action-button" 
                                onclick="deleteStudent('${docSnapshot.id}', '${program}')"
                                title="Delete Student">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    `
                };
                rows.push(row);
            }
        }

        // Use Bootstrap Table's method to update the data
        $('#student_table').bootstrapTable('load', rows);
        
    } catch (error) {
        console.error("Error retrieving student data: ", error);
        const tableBody = document.querySelector('#student_table tbody');
        tableBody.innerHTML = `
            <tr>
                <td colspan="13" class="text-center">Error retrieving data. Please try again.</td>
            </tr>
        `;
    }
}

function updateStudent(studentId, currentProgram) {
    sessionStorage.setItem('currentStudentProgram', currentProgram);
    
    const programDocRef = doc(db, "students", currentProgram);
    const studentDocRef = doc(programDocRef, "students", studentId);
    const allStudentDocRef = doc(db, "allStudents", studentId);
    
    Promise.all([getDoc(studentDocRef), getDoc(allStudentDocRef)]).then(([studentDoc, allStudentDoc]) => {
        if (studentDoc.exists() && allStudentDoc.exists()) {
            const studentData = studentDoc.data();
            const allStudentData = allStudentDoc.data();
            
            // Populate the form with existing data
            document.getElementById('student-Name').value = allStudentData.name || "";
            document.getElementById('student-Id').value = allStudentData.studentId || "";
            document.getElementById('student-email').value = allStudentData.email || "";
            document.getElementById('student-contact').value = studentData.contact || "";
            document.getElementById('student-gender').value = studentData.gender || "";
            document.getElementById('student-nationality').value = studentData.nationality || "";
            document.getElementById('student-program').value = allStudentData.currentProgram || "";
            document.getElementById('address-no').value = studentData.address ? studentData.address.no : "";
            document.getElementById('address-road').value = studentData.address ? studentData.address.road : "";
            document.getElementById('address-postcode').value = studentData.address ? studentData.address.postcode : "";
            document.getElementById('address-city').value = studentData.address ? studentData.address.city : "";
            document.getElementById('address-state').value = studentData.address ? studentData.address.state : "";
            document.getElementById('internship-Company').value = studentData.internshipCompany || "";
            document.getElementById('internship-Status').value = studentData.internshipStatus || "";
            document.getElementById('student-Id').setAttribute('readonly', true);
            document.getElementById('student-email').setAttribute('readonly', true);
            document.getElementById('internship-Status').disabled = false;

            if (studentData.resume) {
                document.getElementById('resume-filename').value = getFileNameFromURL(studentData.resume) || "Choose A File";
            } else {
                document.getElementById('resume-filename').value = "Choose A File";
            }
            
            if (studentData.placementLetter) {
                document.getElementById('placementLetter-filename').value = getFileNameFromURL(studentData.placementLetter) || "Choose A File";
            } else {
                document.getElementById('placementLetter-filename').value = "Choose A File";
            }

            // Change the modal title and button text
            document.getElementById('form-mode').value = 'update'; // Set form mode to 'update'
            document.getElementById('createStudentModalLabel').textContent = 'Update Student';
            document.querySelector('#studentForm button[type="submit"]').textContent = 'Update';
            // Change the form submission handler
            const form = document.getElementById('studentForm');
            form.onsubmit = (e) => handleUpdateStudent(e, studentId);

            // Show the modal
            $('#createStudentModal').modal('show');
        } else {
            console.log("No such document!");
        }
    }).catch((error) => {
        console.log("Error getting documents:", error);
    });
}

// Helper function to extract filename from URL
function getFileNameFromURL(url) {
    if (!url) return '';
    const parts = url.split('/');
    return decodeURIComponent(parts[parts.length - 1].split('?')[0]);
}

// Add event listeners for file inputs
document.getElementById('student-resume').addEventListener('change', function(e) {
    const fileName = e.target.files[0] ? e.target.files[0].name : '';
    document.getElementById('resume-filename').value = fileName;
});

document.getElementById('student-placementLetter').addEventListener('change', function(e) {
    const fileName = e.target.files[0] ? e.target.files[0].name : '';
    document.getElementById('placementLetter-filename').value = fileName;
});

// Add click events to trigger file selection
document.querySelector('label[for="student-resume"]').addEventListener('click', function() {
    document.getElementById('student-resume').click();
});

document.querySelector('label[for="student-placementLetter"]').addEventListener('click', function() {
    document.getElementById('student-placementLetter').click();
});


async function handleUpdateStudent(e, studentId) {
    e.preventDefault();

    const formMode = document.getElementById('form-mode').value;

    if (formMode !== 'update') {
        return; // If the form is not in update mode, don't process the submission
    }

    // Collect updated data from the form
    const updatedData = {
        studentName: document.getElementById('student-Name').value,
        studentId: document.getElementById('student-Id').value,
        email: document.getElementById('student-email').value,
        contact: document.getElementById('student-contact').value,
        gender: document.getElementById('student-gender').value,
        nationality: document.getElementById('student-nationality').value,
        program: document.getElementById('student-program').value,
        address: {
            no: document.getElementById('address-no').value,
            road: document.getElementById('address-road').value,
            postcode: document.getElementById('address-postcode').value,
            city: document.getElementById('address-city').value,
            state: document.getElementById('address-state').value
        },
        internshipCompany: document.getElementById('internship-Company').value,
        internshipStatus: document.getElementById('internship-Status').value
    };

    console.log("Updated Data: ", updatedData);

    const currentProgram = sessionStorage.getItem('currentStudentProgram');
    const newProgram = updatedData.program;

    try {
        // Fetch the current student document
        const allStudentDocRef = doc(db, "allStudents", studentId);

        const studentDocRef = doc(db, "students", currentProgram, "students", studentId);
        const studentSnapshot = await getDoc(studentDocRef);
        const studentData = studentSnapshot.data();

        // Delete old resume and placement letter if new files are uploaded
        const oldResumeUrl = studentData.resume; // Assuming the URL is stored here
        const oldPlacementLetterUrl = studentData.placementLetter; // Assuming the URL is stored here

        // Handle resume upload
        const resumeFile = document.getElementById('student-resume').files[0];
        if (resumeFile) {
            if (oldResumeUrl) {
                // Delete the old resume file from storage
                const oldResumeRef = ref(storage, oldResumeUrl);
                try {
                    await deleteObject(oldResumeRef);
                    console.log(`Successfully deleted old resume at: ${oldResumeUrl}`);
                } catch (error) {
                    console.error("Error deleting old resume: ", error.message);
                }
            }
            const resumeUploadPath = `resumes/${studentId}/${resumeFile.name}`;
            updatedData.resume = await uploadFile(resumeFile, resumeUploadPath); // Add the resume URL to updatedData
        }

        // Handle placement letter upload
        const placementLetterFile = document.getElementById('student-placementLetter').files[0];
        if (placementLetterFile) {
            if (oldPlacementLetterUrl) {
                // Delete the old placement letter file from storage
                const oldPlacementLetterRef = ref(storage, oldPlacementLetterUrl);
                try {
                    await deleteObject(oldPlacementLetterRef);
                    console.log(`Successfully deleted old placement letter at: ${oldPlacementLetterUrl}`);
                } catch (error) {
                    console.error("Error deleting old placement letter: ", error.message);
                }
            }
            const placementLetterUploadPath = `placementLetters/${studentId}/${placementLetterFile.name}`;
            updatedData.placementLetter = await uploadFile(placementLetterFile, placementLetterUploadPath); // Add the placement letter URL to updatedData
        }
 
        if (currentProgram !== newProgram) {
            // Move student to new program
            const oldProgramDocRef = doc(db, "students", currentProgram, "students", studentId);
            const newProgramDocRef = doc(db, "students", newProgram, "students", studentId);

            console.log("Moving student to new program: ", newProgram);

            await setDoc(newProgramDocRef, updatedData); // Add to new program
            await deleteDoc(oldProgramDocRef); // Remove from old program

            // Update only allowed fields in `allStudents`
            await updateDoc(allStudentDocRef, {
                name: updatedData.studentName,
                currentProgram: newProgram, // Update to reflect the new program
                programReference: `students/${newProgram}/students/${studentId}`
            });
        } else {
            // Update existing student record
            const studentDocRef = doc(db, "students", currentProgram, "students", studentId);
            console.log("Updating existing student record in program: ", currentProgram);

            await updateDoc(studentDocRef, updatedData); // Only update the necessary fields

             // Update only allowed fields in `allStudents`
            await updateDoc(allStudentDocRef, {
                name: updatedData.studentName,
                currentProgram: newProgram, // Update to reflect the new program
                programReference: `students/${newProgram}/students/${studentId}`
            });
        }

        // Show success alert
        alert("Student data updated successfully!");

        // Hide the modal
        $('#createStudentModal').modal('hide');
      
        // Refresh student data
        const selectedProgram = sessionStorage.getItem('selectedProgram');
        retrieveStudentData(selectedProgram);
        resetFormToCreateMode();

    } catch (error) {
        console.error("Error updating student data: ", error.message, error.stack);
        alert("An error occurred while updating the student information. Please try again.");
    }
}



// Make sure to expose the updateStudent function to the global scope
window.updateStudent = updateStudent;

function resetFormToCreateMode() {
    document.getElementById('studentForm').reset(); // Resets the form

    // Set form mode back to 'create'
    document.getElementById('form-mode').value = 'create';

    // Make student ID and email fields editable again
    document.getElementById('student-Id').removeAttribute('readonly');
    document.getElementById('student-email').removeAttribute('readonly');

    // Restore the modal title and button text
    document.getElementById('createStudentModalLabel').textContent = 'Create Student';
    document.querySelector('#studentForm button[type="submit"]').textContent = 'Create';
    $('#reset-btn').show();

    // Clear any potential session storage or state-related information
    sessionStorage.removeItem('currentStudentProgram');
    sessionStorage.removeItem('selectedStudentId');

    document.getElementById('internship-Status').disabled = true;
}


async function deleteStudent(studentId, program) {
    const programDocRef = doc(db, "students", program);
    const studentDocRef = doc(programDocRef, "students", studentId);
    const allStudentDocRef = doc(db, "allStudents", studentId);

    // Fetch the student's data from Firestore
    const studentSnapshot = await getDoc(studentDocRef);

    if (studentSnapshot.exists()) {
        const studentData = studentSnapshot.data();
        console.log("Retrieved student data:", studentData); // Debugging

        const studentName = studentData.studentName || "N/A";
        const studentID = studentData.studentId || "N/A";
        const resumeUrl = studentData.resume;
        const placementLetterUrl = studentData.placementLetter;
        const email = studentData.email;
        const profilePictureFolder = `students/profile-pictures/${studentId}`;

        console.log("Resume URL:", resumeUrl); // Debugging
        console.log("Placement Letter URL:", placementLetterUrl); // Debugging
        console.log("Email:", email); // Debugging
        console.log("Profile Picture Folder:", profilePictureFolder); // Debugging

        // Update the modal content
        document.getElementById('deleteModalStudentName').innerText = studentName;
        document.getElementById('deleteModalStudentId').innerText = studentID;

        // Show the modal
        $('#deleteConfirmationModal').modal('show');

        // Handle the delete button click
        document.getElementById('confirmDeleteBtn').onclick = async function () {
            let deletionSuccessful = false;

            try {
                // Delete associated files from Firebase Storage
                if (resumeUrl) {
                    const resumeRef = ref(storage, resumeUrl);
                    try {
                        await deleteObject(resumeRef);
                        console.log(`Successfully deleted resume at: ${resumeUrl}`);
                    } catch (error) {
                        console.error("Error deleting resume: ", error.message);
                        alert("Failed to delete the resume.");
                    }
                }

                if (placementLetterUrl) {
                    const placementLetterRef = ref(storage, placementLetterUrl);
                    try {
                        await deleteObject(placementLetterRef);
                        console.log(`Successfully deleted placement letter at: ${placementLetterUrl}`);
                    } catch (error) {
                        console.error("Error deleting placement letter: ", error.message);
                        alert("Failed to delete the placement letter.");
                    }
                }

                // Delete all files in the profile picture folder
                const profilePictureFolderRef = ref(storage, profilePictureFolder);
                try {
                    const listResult = await listAll(profilePictureFolderRef);
                    for (const itemRef of listResult.items) {
                        await deleteObject(itemRef);
                        console.log(`Deleted profile picture: ${itemRef.fullPath}`);
                    }
                } catch (error) {
                    console.error("Error deleting profile pictures: ", error.message);
                    alert("Failed to delete the profile pictures.");
                }

                // Delete student records from Firestore
                await deleteDoc(studentDocRef); // Delete from program
                await deleteDoc(allStudentDocRef); // Delete from allStudents

                // Delete the email document
                const emailDocRef = doc(db, "email", email);
                try {
                    await deleteDoc(emailDocRef);
                    console.log(`Successfully deleted email document for: ${email}`);
                } catch (error) {
                    console.error("Error deleting email document: ", error.message);
                }

                deletionSuccessful = true;

            } catch (error) {
                console.error("Error deleting student: ", error);
                alert("An error occurred while deleting the student.");
            } finally {
                $('#deleteConfirmationModal').modal('hide');
                $('#deleteConfirmationModal').one('hidden.bs.modal', function () {
                    if (deletionSuccessful) {
                        alert(`Student ${studentName} deleted successfully!`);
                        retrieveStudentData(program); // Refresh the student data
                    }
                });
            }
        };
    } else {
        console.log("No such student found!");
    }
}




window.deleteStudent = deleteStudent;

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

document.getElementById('createStudentModal').addEventListener('hidden.bs.modal', function () {
    resetFormToCreateMode(); // Reset form when modal is closed
});


document.getElementById('cancel-btn').addEventListener('click', function () {
    resetFormToCreateMode(); // Reset form when cancel button is clicked
});