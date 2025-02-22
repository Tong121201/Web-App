import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";
import { getFirestore, collection, getDocs, doc, getDoc, updateDoc, serverTimestamp, arrayUnion } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getMessaging, getToken } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging.js";

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

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
// Initialize Firebase Storage after your other initializations
const storage = getStorage(app);
const applicationsTable = $('#applications_table');
const messaging = getMessaging(app);

// Declare variables that will be modified
let currentApplicationId = null;
let currentJobId = null;
let currentStatusButtonGroup = null;
let currentOldStatus = null;
let isUpdatingApproved = false;

// Status configuration with button styles
const statusConfig = {
    Pending: 'btn-secondary',
    Shortlisted: 'btn-warning',
    Approved: 'btn-success',
    Rejected: 'btn-danger',
    Withdrawn: 'btn-dark',     // New status
    Accepted: 'btn-success',      // New status
    Declined: 'btn-danger'       // New status
};

// Define the allowed status transitions
const statusTransitions = {
    'Pending': ['Shortlisted', 'Approved', 'Rejected'],
    'Shortlisted': ['Shortlisted', 'Approved', 'Rejected'],
    'Approved': ['Approved'],
    'Rejected': [],
    'Withdrawn': [],    // No transitions allowed
    'Accepted': [],     // No transitions allowed
    'Declined': []      // No transitions allowed
};

// Function to set minimum date for date inputs
function setMinDates() {
    // Get current date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0];
    
    // Set minimum date for interview date picker
    const interviewDatePicker = document.getElementById('interviewDate');
    if (interviewDatePicker) {
        interviewDatePicker.min = today;
    }
    
    // Set minimum date for start date picker
    const startDatePicker = document.getElementById('startDate');
    if (startDatePicker) {
        startDatePicker.min = today;
    }
}

// Existing helper functions
async function getJobDetails(jobId) {
    const jobRef = doc(db, 'jobs', jobId);
    const jobDoc = await getDoc(jobRef);
    return jobDoc.exists() ? jobDoc.data() : null;
}

function formatDate(timestamp) {
    if (!timestamp) return 'N/A';
    const date = timestamp instanceof Date ? timestamp : timestamp.toDate();
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function createActionButtons(applicationId, jobId, currentStatus) {
    // First check if the status is one of the immutable statuses
    const immutableStatuses = ['Withdrawn', 'Accepted', 'Declined'];
    if (immutableStatuses.includes(currentStatus)) {
        const statusMessages = {
            'Withdrawn': 'The applicant has accepted another offer',
            'Declined': 'The applicant has declined offer',
            'Accepted': 'The applicant has accepted this offer'
        };
        
        return `
            <div class="btn-group" id="status-${applicationId}">
                <button type="button" 
                        class="btn btn-sm ${statusConfig[currentStatus]}" 
                        style="cursor: help;"
                        onclick="showStatusMessage('${currentStatus}')">
                    ${currentStatus}
                </button>
            </div>
        `;
    }

    const availableStatuses = statusTransitions[currentStatus] || [];
    
    // If there are no available transitions or status is Rejected
    if (availableStatuses.length === 0) {
        return `
            <div class="btn-group" id="status-${applicationId}">
                <button type="button" 
                        class="btn btn-sm ${statusConfig[currentStatus]}" 
                        style="cursor: not-allowed; opacity: 1;">
                    ${currentStatus}
                </button>
            </div>
        `;
    }

    // Create dropdown for available transitions
    const dropdownItems = availableStatuses.map(status => {
        // Customize button text for self-transitions
        const buttonText = status === currentStatus ? 
            `Update ${status} Details` : status;
            
        return `
            <button class="dropdown-item" 
                    data-status="${status}" 
                    onclick="updateApplicationStatus('${applicationId}', '${jobId}', '${status}')">
                ${buttonText}
            </button>
        `;
    }).join('');

    return `
        <div class="btn-group" id="status-${applicationId}">
            <button type="button" 
                    class="btn btn-sm dropdown-toggle ${statusConfig[currentStatus]}" 
                    data-toggle="dropdown" 
                    aria-haspopup="true" 
                    aria-expanded="false">
                ${currentStatus}
            </button>
            <div class="dropdown-menu">
                ${dropdownItems}
            </div>
        </div>
    `;
}

// Add this new function to handle showing status messages
function showStatusMessage(status) {
    const messages = {
        'Withdrawn':'Information: The applicant has chosen to accept another offer.',
        'Declined': 'Information: The applicant has decided to decline this offer.',
        'Accepted': 'Information: Congratulations! The applicant has accepted your offer.'
    };
    
    alert(messages[status]);
}

// Make the new function available globally
window.showStatusMessage = showStatusMessage;

// Function to update action button HTML
function updateActionButtonHTML(applicationId, jobId, newStatus) {
    return createActionButtons(applicationId, jobId, newStatus);
}

async function updateApplicationStatus(applicationId, jobId, newStatus) {
    try {
        // Get the current application data
        const applicationRef = doc(db, 'applications', jobId, 'applicants', applicationId);
        const applicationDoc = await getDoc(applicationRef);
        
        if (!applicationDoc.exists()) {
            console.error('Application not found');
            return;
        }

        const currentStatus = applicationDoc.data().status;

        // Check if the application is in an immutable state
        const immutableStatuses = ['Withdrawn', 'Accepted', 'Declined'];
        if (immutableStatuses.includes(currentStatus)) {
            alert(`Cannot update application status: Application is ${currentStatus}`);
            return;
        }

        // Get the button group element
        const buttonGroup = document.getElementById(`status-${applicationId}`);
        if (!buttonGroup) {
            console.error('Button group not found');
            return;
        }

        // Get the current status
        const currentButton = buttonGroup.querySelector('.btn');
        const currentUIStatus = currentButton.textContent.trim();

        // Validate the status transition
        const allowedTransitions = statusTransitions[currentUIStatus] || [];
        if (!allowedTransitions.includes(newStatus)) {
            alert('Invalid status transition');
            return;
        }

        // Update the global variables
        currentApplicationId = applicationId;
        currentJobId = jobId;
        currentStatusButtonGroup = buttonGroup;
        currentOldStatus = currentUIStatus;

        isUpdatingApproved = (currentUIStatus === 'Approved' && newStatus === 'Approved');

        
        const applicationData = applicationDoc.exists() ? applicationDoc.data() : null;

        // Handle different status updates
        switch(newStatus) {
            case 'Shortlisted':
                if (applicationData?.interviewDetails) {
                    // Pre-fill form with existing data
                    document.getElementById('interviewDate').value = applicationData.interviewDetails.date || '';
                    // Convert stored AM/PM time back to 24-hour format for the input
                    const time24 = applicationData.interviewDetails.time24h || 
                                 convertTo24Hour(applicationData.interviewDetails.time);
                    document.getElementById('interviewTime').value = time24;
                    document.getElementById('interviewType').value = applicationData.interviewDetails.type || '';
                    document.getElementById('interviewLocation').value = applicationData.interviewDetails.location || '';
                    document.getElementById('additionalNotes').value = applicationData.interviewDetails.notes || '';
                    
                    // Show location field if type is selected
                    if (applicationData.interviewDetails.type) {
                        document.getElementById('locationDetails').classList.remove('d-none');
                    }
                }
                $('#shortlistModal').modal('show');
                break;

            case 'Approved':
                if (applicationData?.offerDetails) {
                    // Pre-fill form with existing data
                    document.getElementById('startDate').value = applicationData.offerDetails.startDate || '';
                    document.getElementById('acceptanceNotes').value = applicationData.offerDetails.notes || '';
                    // Don't pre-fill file input for security reasons
                    document.getElementById('fileName').textContent = applicationData.offerDetails.originalName || 'No file chosen';
                }
                $('#acceptModal').modal('show');
                break;

            case 'Rejected':
                $('#rejectModal').modal('show');
                break;

            default:
                await performStatusUpdate(applicationId, jobId, newStatus);
        }
    } catch (error) {
        console.error('Error updating status:', error);
        alert('Failed to update status. Please try again.');
    }
}

$('#acceptModal').on('hidden.bs.modal', function () {
    isUpdatingApproved = false; // Reset the flag when modal is closed
});

// Function to perform the actual status update
async function performStatusUpdate(applicationId, jobId, newStatus, additionalData = {}) {
    try {
        // Generate new action button HTML
        const newActionButtonHTML = updateActionButtonHTML(applicationId, jobId, newStatus);
        
        // Update UI immediately (optimistic update)
        if (currentStatusButtonGroup) {
            currentStatusButtonGroup.outerHTML = newActionButtonHTML;
        }

        // Prepare update data
        const updateData = {
            status: newStatus,
            updatedAt: serverTimestamp(),
            ...additionalData
        };

        // Update Firestore
        const applicationRef = doc(db, 'applications', jobId, 'applicants', applicationId);
        await updateDoc(applicationRef, updateData);

        // Update the table row data
        const index = applicationsTable.bootstrapTable('getData').findIndex(row => {
            return row._applicationId === applicationId && row._jobId === jobId;
        });

        if (index !== -1) {
            // Update both status and action columns
            applicationsTable.bootstrapTable('updateCell', {
                index: index,
                field: 'status',
                value: newStatus
            });
            
            applicationsTable.bootstrapTable('updateCell', {
                index: index,
                field: 'action',
                value: newActionButtonHTML
            });
        }

    } catch (error) {
        console.error('Error updating status:', error);
        // Revert UI changes on error
        if (currentStatusButtonGroup && currentOldStatus) {
            currentStatusButtonGroup.outerHTML = updateActionButtonHTML(applicationId, jobId, currentOldStatus);
        }
        alert('Failed to update status. Please try again.');
    }
}

// Add these new functions to clear form data
function clearShortlistForm() {
    document.getElementById('shortlistForm').reset();
    document.getElementById('locationDetails').classList.add('d-none');
    document.getElementById('interviewLocation').value = '';
    $('#shortlistModal').modal('hide');
}

// Reset all form values and stored application references
function clearAcceptForm() {
    document.getElementById('acceptForm').reset();
    document.getElementById('offerLetter').value = '';
    document.getElementById('fileName').textContent = 'No file chosen';
    // Clear any stored file data
    if (window.currentFileData) {
        delete window.currentFileData;
    }
    $('#acceptModal').modal('hide');
}

function clearRejectForm() {
    document.getElementById('rejectForm').reset();
    $('#rejectModal').modal('hide');
}

// Form validation functions
function validateShortlistForm() {
    const interviewDate = document.getElementById('interviewDate').value;
    const interviewTime = document.getElementById('interviewTime').value;
    const interviewType = document.getElementById('interviewType').value;
    const location = document.getElementById('interviewLocation');
    
    if (!interviewDate || !interviewTime || !interviewType) {
        alert('Please fill in all required fields (Date, Time, and Interview Type)');
        return false;
    }
    
    // Validate location if interview type is selected
    if (interviewType && !location.classList.contains('d-none')) {
        if (!location.value.trim()) {
            alert('Please provide the interview location or link');
            return false;
        }
    }
    
    return true;
}

async function deletePreviousOfferLetter(applicationDoc) {
    try {
        const data = applicationDoc.data();
        if (data.offerDetails && data.offerDetails.offerLetterPath) {
            try {
                const oldFileRef = ref(storage, data.offerDetails.offerLetterPath);
                await deleteObject(oldFileRef);
                console.log('Previous offer letter deleted successfully');
            } catch (deleteError) {
                // If file doesn't exist, continue without error
                if (deleteError.code !== 'storage/object-not-found') {
                    throw deleteError;
                }
            }
        }
    } catch (error) {
        console.error('Error deleting previous offer letter:', error);
        throw new Error('Failed to delete previous offer letter');
    }
}

// Update the validateAcceptForm function to include file size validation
function validateAcceptForm() {
    const offerLetter = document.getElementById('offerLetter');
    const startDate = document.getElementById('startDate').value;
    
    // If updating an approved application, don't require new file upload
    if (isUpdatingApproved && !offerLetter.files[0]) {
        // Only validate start date for updates without new file
        if (!startDate) {
            alert('Please select a start date');
            return false;
        }
        return true;
    }
    
    // For new approvals or when a new file is selected, validate everything
    if (!isUpdatingApproved && !offerLetter.files[0]) {
        alert('Please upload an offer letter');
        return false;
    }
    
    if (!startDate) {
        alert('Please select a start date');
        return false;
    }
    
    // Only validate file if one is selected
    if (offerLetter.files[0]) {
        // Validate file type
        const file = offerLetter.files[0];
        if (file.type !== 'application/pdf') {
            alert('Please upload a PDF file only');
            return false;
        }
        
        // Validate file size (maximum 5MB)
        const maxSize = 5 * 1024 * 1024; // 5MB in bytes
        if (file.size > maxSize) {
            alert('File size must be less than 5MB');
            return false;
        }
    }
    
    return true;
}

// Add a function to handle file input change for immediate validation
function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
        // Validate file type
        if (file.type !== 'application/pdf') {
            alert('Please select a PDF file only');
            event.target.value = ''; // Clear the file input
            document.getElementById('fileName').textContent = 'No file chosen';
            return;
        }
        
        // Validate file size
        const maxSize = 5 * 1024 * 1024; // 5MB in bytes
        if (file.size > maxSize) {
            alert('File size must be less than 5MB');
            event.target.value = ''; // Clear the file input
            document.getElementById('fileName').textContent = 'No file chosen';
            return;
        }
    }
}

function validateRejectForm() {
    const reason = document.getElementById('rejectionReason').value;
    const details = document.getElementById('feedbackDetails').value.trim();
    //const suggestions = document.getElementById('improvementSuggestions').value.trim();
    
    if (!reason) {
        alert('Please select a rejection reason');
        return false;
    }
    
    if (!details) {
        alert('Please provide detailed feedback');
        return false;
    }
    
    
    return true;
}

// Function to convert 24-hour time to 12-hour format with AM/PM
function formatTimeWithAMPM(time24) {
    if (!time24) return '';
    
    // Parse the time string
    const [hours24, minutes] = time24.split(':');
    const hours24Int = parseInt(hours24);
    
    // Convert to 12-hour format
    let hours12 = hours24Int % 12;
    hours12 = hours12 ? hours12 : 12; // Convert 0 to 12
    const ampm = hours24Int >= 12 ? 'PM' : 'AM';
    
    // Format the time string
    return `${hours12}:${minutes} ${ampm}`;
}

// Function to convert 12-hour time (with AM/PM) to 24-hour format
function convertTo24Hour(time12) {
    if (!time12) return '';
    
    // Check if the time is already in 24-hour format
    if (!time12.includes('AM') && !time12.includes('PM')) {
        return time12;
    }

    const [timeStr, period] = time12.split(' ');
    let [hours, minutes] = timeStr.split(':');
    hours = parseInt(hours);
    
    if (period === 'PM' && hours !== 12) {
        hours += 12;
    } else if (period === 'AM' && hours === 12) {
        hours = 0;
    }
    
    // Pad hours and minutes with leading zeros
    const hours24 = hours.toString().padStart(2, '0');
    return `${hours24}:${minutes}`;
}

// Update the submitShortlist function
async function submitShortlist() {
    try {
        if (!validateShortlistForm()) {
            return;
        }

        const interviewDate = document.getElementById('interviewDate').value;
        const interviewTime24 = document.getElementById('interviewTime').value;
        const interviewTimeWithAMPM = formatTimeWithAMPM(interviewTime24);
        const interviewType = document.getElementById('interviewType').value;
        const location = document.getElementById('interviewLocation').value;
        const notes = document.getElementById('additionalNotes').value;

        const additionalData = {
            interviewDetails: {
                date: interviewDate,
                time: interviewTimeWithAMPM, // Store formatted time with AM/PM
                time24h: interviewTime24,    // Also store 24-hour format for reference
                type: interviewType,
                location: location,
                notes: notes,
                scheduledAt: serverTimestamp()
            }
        };

        await performStatusUpdate(currentApplicationId, currentJobId, 'Shortlisted', additionalData);
        // Send notification if current status is Pending
        if (currentOldStatus === 'Pending') {
            await sendStatusChangeNotification(currentApplicationId, currentJobId, 'Shortlisted');
        } else if (currentOldStatus === 'Shortlisted') {
            await sendStatusChangeNotification(currentApplicationId, currentJobId, 'Updated Shortlisted Information');
        }

        clearShortlistForm();
        $('#shortlistModal').modal('hide');
        alert('Status updated successfully!');
        
    } catch (error) {
        console.error('Error submitting shortlist:', error);
        alert('Failed to schedule interview. Please try again.');
    }
}


async function submitAcceptance() {
    try {
        if (!validateAcceptForm()) {
            return;
        }

        // Ensure we're using the correct application reference
        if (!currentApplicationId || !currentJobId) {
            throw new Error('Missing application reference');
        }

        // Get form data
        const offerLetterInput = document.getElementById('offerLetter');
        const startDate = document.getElementById('startDate').value;
        const notes = document.getElementById('acceptanceNotes').value;

        // Get the current application document
        const applicationRef = doc(db, 'applications', currentJobId, 'applicants', currentApplicationId);
        const applicationDoc = await getDoc(applicationRef);

        if (!applicationDoc.exists()) {
            throw new Error('Application not found');
        }

        let additionalData = {
            offerDetails: {
                startDate: startDate,
                notes: notes,
                offeredAt: serverTimestamp()
            }
        };

        // Only process file upload if a new file is selected
        if (offerLetterInput.files[0]) {
            // Delete previous offer letter if it exists
            await deletePreviousOfferLetter(applicationDoc);

            const offerLetter = offerLetterInput.files[0];
            // Create a unique filename with timestamp and application ID
            const timestamp = Date.now();
            const fileName = `offerLetter_${currentApplicationId}_${timestamp}.pdf`;
            const storagePath = `applications/${currentJobId}/applicants/${currentApplicationId}/documents/${fileName}`;
            
            // Create storage reference
            const storageRef = ref(storage, storagePath);
            
            // Show loading state
            const submitButton = document.querySelector('#acceptModal .btn-success');
            submitButton.disabled = true;
            submitButton.innerHTML = 'Uploading...';

            try {
                // Upload the new file
                const uploadTask = await uploadBytes(storageRef, offerLetter);
                const offerLetterUrl = await getDownloadURL(uploadTask.ref);

                // Update additionalData with file information
                additionalData.offerDetails = {
                    ...additionalData.offerDetails,
                    offerLetterUrl: offerLetterUrl,
                    offerLetterPath: storagePath,
                    fileName: fileName,
                    originalName: offerLetter.name,
                    fileSize: offerLetter.size,
                    uploadedAt: serverTimestamp()
                };
            } catch (uploadError) {
                console.error('Error uploading file:', uploadError);
                throw new Error('Failed to upload offer letter');
            }
        } else if (isUpdatingApproved) {
            // If updating without new file, preserve existing file details
            const existingData = applicationDoc.data();
            if (existingData.offerDetails) {
                additionalData.offerDetails = {
                    ...additionalData.offerDetails,
                    offerLetterUrl: existingData.offerDetails.offerLetterUrl,
                    offerLetterPath: existingData.offerDetails.offerLetterPath,
                    fileName: existingData.offerDetails.fileName,
                    originalName: existingData.offerDetails.originalName,
                    fileSize: existingData.offerDetails.fileSize,
                    uploadedAt: existingData.offerDetails.uploadedAt
                };
            }
        }

        await performStatusUpdate(currentApplicationId, currentJobId, 'Approved', additionalData);
        
        // Send notification if current status is Pending or Shortlisted
        if (['Pending', 'Shortlisted'].includes(currentOldStatus)) {
            await sendStatusChangeNotification(currentApplicationId, currentJobId, 'Approved');
        } else if (currentOldStatus === 'Approved') {
            await sendStatusChangeNotification(currentApplicationId, currentJobId, 'Updated Offer Information');
        }

        clearAcceptForm();
        $('#acceptModal').modal('hide');
        alert('Offer letter ' + (offerLetterInput.files[0] ? 'uploaded' : 'updated') + ' and status updated successfully!');

    } catch (error) {
        console.error('Error submitting acceptance:', error);
        alert('Failed to submit offer. Please try again. Error: ' + error.message);
    } finally {
        const submitButton = document.querySelector('#acceptModal .btn-success');
        submitButton.disabled = false;
        submitButton.innerHTML = 'Submit Offer';
    }
}
async function submitRejection() {
    try {
        if (!validateRejectForm()) {
            return;
        }

        const reason = document.getElementById('rejectionReason').value;
        const details = document.getElementById('feedbackDetails').value;
        const suggestions = document.getElementById('improvementSuggestions').value;

        const additionalData = {
            rejectionDetails: {
                reason: reason,
                feedback: details,
                improvementSuggestions: suggestions,
                rejectedAt: serverTimestamp()
            }
        };

        await performStatusUpdate(currentApplicationId, currentJobId, 'Rejected', additionalData);

        // Send notification if current status is Pending or Shortlisted
        await sendStatusChangeNotification(currentApplicationId, currentJobId, 'Rejected');

        clearRejectForm();
        $('#rejectModal').modal('hide');
        alert('Status updated successfully!');
        
    } catch (error) {
        console.error('Error submitting rejection:', error);
        alert('Failed to submit rejection feedback. Please try again.');
    }
}

// Event listener for interview type change
document.getElementById('interviewType').addEventListener('change', function() {
    const locationDiv = document.getElementById('locationDetails');
    const locationInput = document.getElementById('interviewLocation');
    
    locationDiv.classList.remove('d-none');
    
    if (this.value === 'online') {
        locationInput.placeholder = 'Enter meeting link (e.g., Zoom, Google Meet)';
    } else if (this.value === 'physical') {
        locationInput.placeholder = 'Enter physical location address';
    } else {
        locationDiv.classList.add('d-none');
    }
});

// Make functions globally available
window.updateApplicationStatus = updateApplicationStatus;
window.submitShortlist = submitShortlist;
window.submitAcceptance = submitAcceptance;
window.submitRejection = submitRejection;

// Modified fetch function to include necessary IDs for updates
async function fetchApplications() {
    try {
        const user = auth.currentUser;
        if (!user) {
            console.error('No user logged in');
            return;
        }

        const applications = [];
        const employerRef = doc(db, 'employers', user.uid);
        const employerDoc = await getDoc(employerRef);
        
        if (!employerDoc.exists()) {
            console.error('Employer document not found');
            return;
        }

        const employerData = employerDoc.data();
        const jobIds = employerData.jobIds || [];

        for (const jobId of jobIds) {
            const jobData = await getJobDetails(jobId);
            if (!jobData) continue;

            const applicationIds = jobData.applicationIds || [];

            for (const applicationId of applicationIds) {
                const applicationRef = doc(db, 'applications', jobId, 'applicants', applicationId);
                const applicationDoc = await getDoc(applicationRef);

                if (!applicationDoc.exists()) continue;

                const applicationData = applicationDoc.data();
                
                applications.push({
                    _applicationId: applicationId,
                    _jobId: jobId,
                    studentName: applicationData.studentName,
                    studentId: applicationData.studentId,
                    studentEmail: applicationData.studentEmail,
                    studentPhone: applicationData.studentPhone,
                    resume: createDocumentLink(applicationData.resumeUrl, 'resume', applicationId, jobId),
                    placementLetter: createDocumentLink(applicationData.placementLetterUrl, 'placement', applicationId, jobId),
                    companyName: employerData.company_name || 'N/A',
                    jobTitle: jobData.title || 'N/A',
                    applicationDate: applicationData.appliedAt 
                                    ? formatDate(applicationData.appliedAt)
                                    : 'Date not recorded',
                    status: applicationData.status || 'Pending',
                    action: createActionButtons(applicationId, jobId, applicationData.status || 'Pending')
                });
            }
        }

        applicationsTable.bootstrapTable('load', applications);

    } catch (error) {
        console.error('Error fetching applications:', error);
        alert('Error loading applications. Please try again.');
    }
}

// Make updateApplicationStatus available globally
window.updateApplicationStatus = updateApplicationStatus;
window.trackDocumentView = trackDocumentView;


// Modified function to create document links with tracking
function createDocumentLink(url, type, applicationId, jobId) {
    if (!url) return 'N/A';
    return `<a href="${url}" 
              target="_blank" 
              class="download-button"
              onclick="trackDocumentView('${applicationId}', '${jobId}', '${type}')">
              <i class="bi bi-file-earmark-arrow-down-fill"></i>
            </a>`;
}

// Simplified function to track only first-time document views
async function trackDocumentView(applicationId, jobId, documentType) {
    try {
        const applicationRef = doc(db, 'applications', jobId, 'applicants', applicationId);
        const applicationDoc = await getDoc(applicationRef);
        
        if (!applicationDoc.exists()) {
            console.error('Application document not found');
            return;
        }

        const data = applicationDoc.data();
        const updateField = documentType === 'resume' ? 'resumeRead' : 'placementLetterRead';
        
        // Only update and send notification if the document hasn't been read yet
        if (!data[updateField]) {
            // Update document read status
            await updateDoc(applicationRef, {
                [updateField]: serverTimestamp()
            });

            // Get necessary details for notification
            const user = auth.currentUser;
            const [employerDoc, jobDoc] = await Promise.all([
                getDoc(doc(db, 'employers', user.uid)),
                getDoc(doc(db, 'jobs', jobId))
            ]);

            if (!employerDoc.exists() || !jobDoc.exists()) {
                console.error('Employer or Job document not found');
                return;
            }

            const companyName = employerDoc.data().company_name;
            const jobTitle = jobDoc.data().title;
            const studentId = data.studentId;

            // Get student's device token
            const studentRef = doc(db, 'allStudents', studentId);
            const studentDoc = await getDoc(studentRef);
            
            if (!studentDoc.exists()) {
                console.error('Student document not found');
                return;
            }

            const deviceToken = studentDoc.data().deviceToken;

            if (!deviceToken) {
                console.error('No device token found for student:', studentId);
                return;
            }

            // Prepare notification message
            const documentName = documentType === 'resume' ? 'resume' : 'placement letter';
            const notificationTitle = 'Document Reviewed';
            const notificationBody = `${companyName} has reviewed your ${documentName} for the ${jobTitle} position.`;

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
                        applicationId,
                        jobId,
                        type: 'document_review',
                        documentType,
                        companyName,
                        jobTitle
                    }
                })
            });

            const responseData = await response.json();
            console.log('Notification server response:', responseData);

            if (!response.ok) {
                throw new Error(`Notification server error: ${JSON.stringify(responseData)}`);
            }

            // Store notification in Firestore
            await updateDoc(studentRef, {
                notifications: arrayUnion({
                    title: notificationTitle,
                    body: notificationBody,
                    type: 'document_review',
                    applicationId,
                    jobId,
                    documentType,
                    companyName,
                    jobTitle,
                    createdAt: new Date().toISOString(),
                    read: false
                })
            });

            console.log(`${documentType} first-time view recorded and notification sent`);
        }
    } catch (error) {
        console.error('Error tracking document view:', error);
    }
}


// Initialize the page
document.addEventListener('DOMContentLoaded', () => {
    // Set minimum dates for date pickers
    setMinDates();

    // Add modal event handlers for proper cleanup
    $('#acceptModal').on('hidden.bs.modal', function () {
        clearAcceptForm();
        // Reset stored application reference
        currentApplicationId = null;
        currentJobId = null;
    });

    // Update file input handler
    const offerLetterInput = document.getElementById('offerLetter');
    const fileNameDisplay = document.getElementById('fileName');

    if (offerLetterInput) {
        offerLetterInput.addEventListener('change', function(event) {
            handleFileSelect(event); // Validate file
            if (this.files[0]) {
                fileNameDisplay.textContent = this.files[0].name;
            } else {
                fileNameDisplay.textContent = 'No file chosen';
            }
        });
    }
    
    // Add modal event listeners for date picker updates
    $('#shortlistModal').on('show.bs.modal', setMinDates);
    $('#acceptModal').on('show.bs.modal', setMinDates);
    
    // Add these new event listeners
    const shortlistCancelBtn = document.querySelector('#shortlistModal .btn-secondary');
    const acceptCancelBtn = document.querySelector('#acceptModal .btn-secondary');
    const rejectCancelBtn = document.querySelector('#rejectModal .btn-secondary');

    shortlistCancelBtn.addEventListener('click', clearShortlistForm);
    acceptCancelBtn.addEventListener('click', clearAcceptForm);
    rejectCancelBtn.addEventListener('click', clearRejectForm);
    
    applicationsTable.bootstrapTable({
        data: []
    });

    onAuthStateChanged(auth, (user) => {
        if (user) {
            fetchApplications();
        } else {
            window.location.href = '/login.html';
        }
    });
});

async function sendStatusChangeNotification(applicationId, jobId, newStatus) {
    try {
        // Get the application document
        const applicationRef = doc(db, 'applications', jobId, 'applicants', applicationId);
        const applicationDoc = await getDoc(applicationRef);
        
        if (!applicationDoc.exists()) {
            console.error('Application document not found');
            return;
        }

        const applicationData = applicationDoc.data();
        const studentId = applicationData.studentId;
        console.log('Student ID:', studentId);

        // Get student's device token
        const studentRef = doc(db, 'allStudents', studentId);
        const studentDoc = await getDoc(studentRef);
        
        if (!studentDoc.exists()) {
            console.error('Student document not found in allStudents collection');
            return;
        }

        const deviceToken = studentDoc.data().deviceToken;
        console.log('Device Token:', deviceToken);
        
        if (!deviceToken) {
            console.error('No device token found for student:', studentId);
            return;
        }

        // Get job and employer details
        const user = auth.currentUser;
        const [employerDoc, jobDoc] = await Promise.all([
            getDoc(doc(db, 'employers', user.uid)),
            getDoc(doc(db, 'jobs', jobId))
        ]);

        if (!employerDoc.exists() || !jobDoc.exists()) {
            console.error('Employer or Job document not found');
            return;
        }

        const companyName = employerDoc.data().company_name;
        const jobTitle = jobDoc.data().title;

        // Prepare notification message based on status
        let notificationBody;
        let notificationTitle = 'Application Status Update';
        
        switch(newStatus) {
            case 'Updated Shortlisted Information':
                notificationBody = `${companyName} has updated shortlisted information of your application for ${jobTitle}. Please check your application status.`;
                break;
            case 'Updated Offer Information':
                notificationBody = `${companyName} has updated offer information of your application for ${jobTitle}. Please check your application status.`;
                break;
            default:
                notificationBody = `${companyName} has ${newStatus.toLowerCase()} your application for ${jobTitle}. Please check your application status.`;
        }

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
                    applicationId,
                    jobId,
                    newStatus,
                    companyName,
                    jobTitle,
                    type: 'application_update'
                }
            })
        });

        const responseData = await response.json();
        console.log('Notification server response:', responseData);

        if (!response.ok) {
            throw new Error(`Notification server error: ${JSON.stringify(responseData)}`);
        }

        // Store notification in Firestore
        const notificationsRef = doc(db, 'allStudents', studentId);
        await updateDoc(notificationsRef, {
            notifications: arrayUnion({
                title: notificationTitle,
                body: notificationBody,
                type: 'application_update',
                applicationId,
                jobId,
                status: newStatus,
                companyName,
                jobTitle,
                createdAt: new Date().toISOString(),
                read: false
            })
        });

        console.log('Notification sent and stored successfully');

    } catch (error) {
        console.error('Error in sendStatusChangeNotification:', error);
        alert('Failed to send notification to applicant. Please check the console for details.');
    }
}
