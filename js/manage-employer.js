// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
    getFirestore, 
    collection, 
    getDocs, 
    getDoc,
    doc, 
    updateDoc, 
    deleteDoc,
    query,
    where
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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
const db = getFirestore(app);

function selectProgram(program) {
    sessionStorage.setItem('selectedProgram', program); // Store program in session storage
    console.log("Selected Program: " + program); // Corrected the variable name to 'program'
    window.location.href = 'studentpage.html'; // Navigate to the student page
}
window.selectProgram = selectProgram;

// Update the modal initialization to use Bootstrap 5 syntax
document.addEventListener('DOMContentLoaded', function() {
    loadEmployerData();
    // Initialize Bootstrap modals
    const updateModal = new bootstrap.Modal(document.getElementById('updateEmployerModal'));
    const deleteModal = new bootstrap.Modal(document.getElementById('deleteConfirmationModal'));
    const blockModal = new bootstrap.Modal(document.getElementById('blockConfirmationModal'));
})


async function loadEmployerData() {
    try {
        const employersSnapshot = await getDocs(collection(db, "employers"));
        const employers = [];

        for (const employerDoc of employersSnapshot.docs) {
            const employerData = employerDoc.data();
            const employerId = employerDoc.id; // Use the current document ID as employerId
            
            // Get the subcollection reference for the employer's jobs
            const jobsRef = collection(db, "jobs", employerId, "employerJobs");

            // Query all jobs in the employer's subcollection
            const jobsSnapshot = await getDocs(jobsRef);

            // Count the number of jobs
            const jobCount = employerData.jobIds ? employerData.jobIds.length : 0;

            // Combine address fields
            const address = `${employerData.address.no}, ${employerData.address.road}, ${employerData.address.postcode} ${employerData.address.city}, ${employerData.address.state}`;

            employers.push({
                id: employerDoc.id,
                companyName: employerData.company_name,
                companyEmail: employerData.company_email,
                companyTel: employerData.company_tel,
                companyAddress: address,
                hiredStudents: employerData.hiredNumber, // Placeholder for future implementation
                createdJobs: jobCount,
                status: employerData.status || 'Active',
                action: createActionButtons(employerDoc.id, employerData)
            });
        }

        // Initialize Bootstrap Table with data
        $('#employer_table').bootstrapTable('load', employers);

    } catch (error) {
        console.error("Error loading employer data:", error);
        alert("Error loading employer data. Please try again.");
    }
}

function createActionButtons(employerId, employerData) {
    return `
        <div class="btn-group" role="group">
            <button type="button" class="btn btn-primary btn-sm action-button" 
                onclick="openUpdateModal('${employerId}')" 
                title="Edit">
                <i class="fas fa-edit"></i>
            </button>
            <button type="button" class="btn btn-danger btn-sm action-button" 
                onclick="openDeleteModal('${employerId}')"
                title="Delete">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `;
}

// Update Modal Functions
window.openUpdateModal = async function(employerId) {
    try {
        const employerRef = doc(db, "employers", employerId);
        const employerDoc = await getDoc(employerRef);  // Changed from getDocs to getDoc
        
        if (!employerDoc.exists()) {
            alert("Employer not found!");
            return;
        }

        const data = employerDoc.data();

        // Populate the update form
        document.getElementById('updateCompanyName').value = data.company_name;
        document.getElementById('updateCompanyEmail').value = data.company_email;
        document.getElementById('updateCompanyTel').value = data.company_tel;
        document.getElementById('address-no').value = data.address.no;
        document.getElementById('address-road').value = data.address.road;
        document.getElementById('address-postcode').value = data.address.postcode;
        document.getElementById('address-city').value = data.address.city;
        document.getElementById('address-state').value = data.address.state;
        // Store the employer ID for the update operation
        document.getElementById('updateEmployerForm').dataset.employerId = employerId;

        // Show the modal
        const updateModal = new bootstrap.Modal(document.getElementById('updateEmployerModal'));
        updateModal.show();
    } catch (error) {
        console.error("Error opening update modal:", error);
        alert("Error loading employer data. Please try again.");
    }
};

// Delete Modal Functions
window.openDeleteModal = async function(employerId) {
    try {
        const employerRef = doc(db, "employers", employerId);
        const employerDoc = await getDoc(employerRef);  // Changed from getDocs to getDoc
        
        if (!employerDoc.exists()) {
            alert("Employer not found!");
            return;
        }

        const data = employerDoc.data();

        document.getElementById('deleteModalCompanyName').textContent = data.company_name;
        document.getElementById('deleteModalCompanyEmail').textContent = data.company_email;
        
        // Store the employer ID for the delete operation
        document.getElementById('confirmDeleteBtn').dataset.employerId = employerId;
        
        // Show the modal
        const deleteModal = new bootstrap.Modal(document.getElementById('deleteConfirmationModal'));
        deleteModal.show();
    } catch (error) {
        console.error("Error opening delete modal:", error);
        alert("Error loading employer data. Please try again.");
    }
};



// Update the modal hide calls
document.getElementById('confirmUpdateBtn').addEventListener('click', async function() {
    try {
        const form = document.getElementById('updateEmployerForm');
        const employerId = form.dataset.employerId;

        const updatedData = {
            company_name: document.getElementById('updateCompanyName').value,
            company_email: document.getElementById('updateCompanyEmail').value,
            company_tel: document.getElementById('updateCompanyTel').value,
            address: {
                no: document.getElementById('address-no').value,
                road: document.getElementById('address-road').value,
                postcode: document.getElementById('address-postcode').value,
                city: document.getElementById('address-city').value,
                state: document.getElementById('address-state').value
            },
            last_updated: Date.now()
        };

        await updateDoc(doc(db, "employers", employerId), updatedData);
        
        const modal = bootstrap.Modal.getInstance(document.getElementById('updateEmployerModal'));
        modal.hide();
        loadEmployerData(); // Reload the table
        alert("Employer information updated successfully!");

    } catch (error) {
        console.error("Error updating employer:", error);
        alert("Error updating employer information. Please try again.");
    }
});

document.getElementById('confirmDeleteBtn').addEventListener('click', async function() {
    try {
        const employerId = this.dataset.employerId;
        await deleteDoc(doc(db, "employers", employerId));
        
        const modal = bootstrap.Modal.getInstance(document.getElementById('deleteConfirmationModal'));
        modal.hide();
        loadEmployerData(); // Reload the table
        alert("Employer account deleted successfully!");

    } catch (error) {
        console.error("Error deleting employer:", error);
        alert("Error deleting employer account. Please try again.");
    }
});


// Block Modal Functions
window.openBlockModal = async function(employerId) {
    try {
        const employerRef = doc(db, "employers", employerId);
        const employerDoc = await getDoc(employerRef);  // Changed from getDocs to getDoc
        
        if (!employerDoc.exists()) {
            alert("Employer not found!");
            return;
        }

        const data = employerDoc.data();
        const currentStatus = data.status || 'Active';
        const actionText = currentStatus === 'Active' ? 'block' : 'unblock';

        document.getElementById('blockActionText').textContent = actionText;
        document.getElementById('blockModalCompanyName').textContent = data.company_name;
        document.getElementById('blockModalCompanyEmail').textContent = data.company_email;
        
        // Store the employer ID and current status for the block operation
        const confirmBtn = document.getElementById('confirmBlockBtn');
        confirmBtn.dataset.employerId = employerId;
        confirmBtn.dataset.currentStatus = currentStatus;
        
        // Show the modal
        const blockModal = new bootstrap.Modal(document.getElementById('blockConfirmationModal'));
        blockModal.show();
    } catch (error) {
        console.error("Error opening block modal:", error);
        alert("Error loading employer data. Please try again.");
    }
};


document.getElementById('confirmBlockBtn').addEventListener('click', async function() {
    try {
        const employerId = this.dataset.employerId;
        const currentStatus = this.dataset.currentStatus;
        const newStatus = currentStatus === 'Active' ? 'Blocked' : 'Active';

        await updateDoc(doc(db, "employers", employerId), {
            status: newStatus,
            last_updated: Date.now()
        });

        const modalElement = document.getElementById('blockConfirmationModal');
        const modalInstance = bootstrap.Modal.getOrCreateInstance(modalElement);
        modalInstance.hide();

        loadEmployerData(); // Reload the table
        alert(`Employer account ${newStatus.toLowerCase()} successfully!`);

    } catch (error) {
        console.error("Error updating employer status:", error);
        alert("Error updating employer status. Please try again.");
    }
});


// Reset Form Button Handler
document.getElementById('resetFormBtn').addEventListener('click', function() {
    document.getElementById('updateEmployerForm').reset();
});

