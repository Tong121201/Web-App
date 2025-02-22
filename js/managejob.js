import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, query, where, orderBy, updateDoc, deleteDoc, getDoc, Timestamp, doc,arrayUnion, } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js";

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

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Modify the authentication check and loadUserJobs function
onAuthStateChanged(auth, (user) => {
    if (user) {
        console.log('User authenticated:', user.uid);
        loadUserJobs();  // Load jobs only after confirming authentication
    } else {
        console.log('No user authenticated, redirecting to login');
        window.location.href = 'login.html';
    }
});




// Global variables
let jobFieldsData = [];
let selectedRequirements = new Set();
let currentModal = null;
let mainModal = null;

// Fetch all job fields and requirements data on page load
async function fetchJobFieldsData() {
    try {
        const snapshot = await getDocs(collection(db, 'fields'));
        jobFieldsData = snapshot.docs.map(doc => {
            const fieldArray = doc.data().field;
            return fieldArray.map(field => ({
                name: field.name,
                jobRequirements: field.jobRequirements
            }));
        }).flat();
        console.log('Fetched job fields data:', jobFieldsData);
    } catch (error) {
        console.error('Error fetching job fields data:', error);
    }
}

function handleFieldSelection() {
    const fieldSelect = document.getElementById('field-select');
    const selectedField = fieldSelect.value;

    if (selectedField) {
        const selectedFieldData = jobFieldsData.find(field => field.name === selectedField);
        if (selectedFieldData) {
            showRequirementsModal(selectedFieldData.jobRequirements);
        }
        fieldSelect.value = "";
    }
}

// Temporary set to track selections during the modal session
let tempSelectedRequirements = new Set();

function showRequirementsModal(requirements) {
    // Temporarily hide the backdrop of the main modal
    $('.modal-backdrop').css('z-index', 1040);
    
    // Create a temporary set based on current selectedRequirements
    tempSelectedRequirements = new Set(selectedRequirements);

    const modalHTML = `
        <div class="modal fade" id="requirementsModal" tabindex="-1" aria-hidden="true" style="z-index: 1060;">
            <div class="modal-dialog" style="z-index: 1070;">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Select Requirements</h5>
                        <button type="button" class="btn-close" onclick="closeRequirementsModal()" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <div class="requirements-checklist">
                            ${requirements.map(req => `
                                <div class="form-check" id="requirement-${req}">
                                    <input class="form-check-input" type="checkbox" value="${req}" id="req-${req}" 
                                        ${tempSelectedRequirements.has(req) ? 'checked' : ''} 
                                        onchange="toggleRequirementHighlight('${req}')">
                                    <label class="form-check-label" for="req-${req}">
                                        ${req}
                                    </label>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" onclick="closeRequirementsModal()">Close</button>
                        <button type="button" class="btn btn-primary" onclick="addSelectedRequirements()">Add Selected</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Remove existing requirements modal if any
    const existingModal = document.getElementById('requirementsModal');
    if (existingModal) {
        existingModal.remove();
    }

    // Add the new modal
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Initialize the requirements modal
    const modalElement = document.getElementById('requirementsModal');
    currentModal = new bootstrap.Modal(modalElement, {
        backdrop: 'static',
        keyboard: false
    });
    
    // Add an additional backdrop with higher z-index
    const backdropDiv = document.createElement('div');
    backdropDiv.className = 'modal-backdrop fade show';
    backdropDiv.style.zIndex = '1050';
    document.body.appendChild(backdropDiv);
    
    // Show the modal
    currentModal.show();
    
    // Ensure the requirements modal is above the main modal
    modalElement.style.zIndex = '1060';

    // Apply initial highlights for already selected requirements
    tempSelectedRequirements.forEach(req => {
        const requirementElement = document.getElementById(`requirement-${req}`);
        if (requirementElement) {
            requirementElement.classList.add('selected-requirement');
        }
    });
}

// Toggle highlight and update temporary selections
function toggleRequirementHighlight(requirement) {
    const requirementElement = document.getElementById(`requirement-${requirement}`);
    const checkbox = document.getElementById(`req-${requirement}`);

    if (checkbox.checked) {
        requirementElement.classList.add('selected-requirement');
        tempSelectedRequirements.add(requirement);
    } else {
        requirementElement.classList.remove('selected-requirement');
        tempSelectedRequirements.delete(requirement);
    }
}

// Function to close the requirements modal and reset temporary selections
function closeRequirementsModal() {
    if (currentModal) {
        // Hide the modal
        currentModal.hide();

        // Reset tempSelectedRequirements to match selectedRequirements on close
        tempSelectedRequirements = new Set(selectedRequirements);

        // Clean up modal elements and backdrops after hiding the modal
        setTimeout(() => {
            const modalElement = document.getElementById('requirementsModal');
            if (modalElement) {
                modalElement.remove();
            }

            // Remove additional backdrops except the main one
            const backdrops = document.querySelectorAll('.modal-backdrop');
            backdrops.forEach((backdrop, index) => {
                if (index > 0) { // Keep the first backdrop for the main modal
                    backdrop.remove();
                }
            });

            // Reset z-index for main backdrop
            const mainBackdrop = document.querySelector('.modal-backdrop');
            if (mainBackdrop) {
                mainBackdrop.style.zIndex = '1040';
            }

            // Reset the create job modal to the correct state
            const createJobModal = document.getElementById('createJobModal');
            if (createJobModal) {
                createJobModal.style.zIndex = '1050';
                document.body.classList.add('modal-open');
            }

            // Set overflow for main modal body
            const mainModalBody = document.querySelector('#createJobModal .modal-body');
            if (mainModalBody) {
                mainModalBody.style.overflow = 'auto';
            }
        }, 150);
    }
}

// Function to add selected requirements and update the main list
function addSelectedRequirements() {
    // Transfer temporary selections to main selectedRequirements set
    selectedRequirements = new Set(tempSelectedRequirements);

    // Update the displayed requirements list with confirmed selections
    updateRequirementsList();

    // Close the modal after saving selections
    closeRequirementsModal();
}


function addCustomRequirement() {
    const customRequirementInput = document.getElementById('custom-requirement');
    const requirement = customRequirementInput.value.trim();
    
    if (requirement) {
        selectedRequirements.add(requirement);
        updateRequirementsList();
        customRequirementInput.value = '';
    }
}

function removeRequirement(requirement) {
    selectedRequirements.delete(requirement);
    updateRequirementsList();
}

function updateRequirementsList() {
    const requirementsList = document.getElementById('job-requirements-list');
    requirementsList.innerHTML = '';
    
    if (selectedRequirements.size === 0) {
        requirementsList.innerHTML = '<div class="text-muted">No requirements selected</div>';
        return;
    }
    
    selectedRequirements.forEach(requirement => {
        const requirementElement = document.createElement('div');
        requirementElement.className = 'requirement-item p-2 mb-2 bg-light rounded d-flex justify-content-between align-items-center';
        requirementElement.innerHTML = `
            <span>${requirement}</span>
            <button type="button" class="btn btn-outline-danger btn-sm" onclick="removeRequirement('${requirement}')">
                <i class="bi bi-trash"></i>
            </button>
        `;
        requirementsList.appendChild(requirementElement);
    });
}

// Modified clearAllInputs function
function clearAllInputs() {
    // Clear all text inputs, textareas, and selects in the create job modal
    const inputs = document.querySelectorAll('#createJobModal input[type="text"], #createJobModal input[type="email"], #createJobModal input[type="tel"], #createJobModal input[type="number"], #createJobModal textarea, #createJobModal select');
    inputs.forEach(input => {
        input.value = '';
    });

    // Reset the job status to "Active"
    const jobStatus = document.querySelector('#createJobModal #job-status');
    if (jobStatus) {
        jobStatus.value = 'active';
    }

    // Clear selected requirements
    selectedRequirements = new Set();
    const requirementsList = document.getElementById('job-requirements-list');
    if (requirementsList) {
        requirementsList.innerHTML = '<div class="text-muted">No requirements selected</div>';
    }
    
    // Clear dynamically added environments and add a default one
    const environmentsContainer = document.getElementById('company-environments-container');
    if (environmentsContainer) {
        environmentsContainer.innerHTML = ''; // Clear all added environments
        // Add a default environment entry
        const defaultEnvironment = document.createElement('div');
        defaultEnvironment.className = 'environment-entry';
        defaultEnvironment.innerHTML = `
            <div class="row">
            <div class="col-md-3">
                <div class="place-name-container">
                    <input type="text" class="form-control" placeholder="Place Name" required>
                </div>
            </div>
            <div class="col-md-7">
                <div class="link-container">
                    <div class="link-row ar-link-row">
                        <input type="text" class="form-control" placeholder="AR Link">
                        <button type="button" class="btn btn-outline-danger delete-link-btn delete-ar-link">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                    <div class="link-row momento-link-row">
                        <input type="text" class="form-control" placeholder="Momento Link">
                        <button type="button" class="btn btn-outline-danger delete-link-btn delete-momento-link">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
            <div class="col-md-2 text-right">
                <div class="btn-container">
                    <button type="button" class="btn btn-outline-danger delete-environment">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </div>
        </div>
        `;
        environmentsContainer.appendChild(defaultEnvironment);
    }

    // Reset form state
    const form = document.getElementById('jobForm');
    if (form) {
        delete form.dataset.jobId;
    }

    // Reset modal title and submit button
    const modalTitle = document.getElementById('createJobModalLabel');
    if (modalTitle) {
        modalTitle.textContent = 'Create Job Listing';
    }

    const submitButton = document.querySelector('#jobForm button[type="submit"]');
    if (submitButton) {
        submitButton.textContent = 'Create';
    }
}


// Modified createJob function
function createJob() {
    clearAllInputs(); // Clear form before showing
    const modal = new bootstrap.Modal(document.getElementById('createJobModal'), {
        backdrop: 'static',
        keyboard: false
    });
    modal.show();
}

// Modified function to properly handle modal closing
function closeMainModal() {
    const modal = bootstrap.Modal.getInstance(document.getElementById('createJobModal'));
    if (modal) {
        clearAllInputs();
        modal.hide();
        
        // Ensure the modal is properly destroyed and recreated
        setTimeout(() => {
            const modalElement = document.getElementById('createJobModal');
            if (modalElement) {
                modalElement.addEventListener('hidden.bs.modal', function handler() {
                    modalElement.removeEventListener('hidden.bs.modal', handler);
                    while (modalElement.classList.contains('modal-backdrop')) {
                        modalElement.classList.remove('modal-backdrop');
                    }
                    document.body.classList.remove('modal-open');
                    const backdrops = document.getElementsByClassName('modal-backdrop');
                    while (backdrops.length > 0) {
                        backdrops[0].remove();
                    }
                });
            }
        }, 150);
    }
}

// Initialize event listeners
document.addEventListener('DOMContentLoaded', () => {
    fetchJobFieldsData();
    initializeCompanyEnvironment();
    document.getElementById('field-select').addEventListener('change', handleFieldSelection);
    
     // Handle modal hidden event
     const createJobModal = document.getElementById('createJobModal');
     if (createJobModal) {
         createJobModal.addEventListener('hidden.bs.modal', function () {
             clearAllInputs();
             // Clean up any remaining modal-related elements
             document.body.classList.remove('modal-open');
             const backdrops = document.getElementsByClassName('modal-backdrop');
             while (backdrops.length > 0) {
                 backdrops[0].remove();
             }
         });
     }

    // Add event listeners for buttons
    const closeButton = document.querySelector('#createJobModal .btn-close');
    const cancelButton = document.querySelector('#createJobModal #cancel-btn');
    const resetButton = document.querySelector('#createJobModal #reset-btn');
    
    if (closeButton) {
        closeButton.addEventListener('click', function() {
            clearAllInputs();
            closeMainModal();
        });
    }
    
    if (cancelButton) {
        cancelButton.addEventListener('click', function() {
            clearAllInputs();
            closeMainModal();
        });
    }

    if (resetButton) {
        resetButton.addEventListener('click', function(e) {
            e.preventDefault(); // Prevent default reset behavior
            clearAllInputs();
        });
    }

    // Ensure proper modal stacking
    createJobModal.addEventListener('show.bs.modal', function () {
        this.style.zIndex = '1050';
    });


    const jobForm = document.getElementById('jobForm');
    if (jobForm) {
        jobForm.addEventListener('submit', handleJobSubmission);
    }

    // Set up event listener for delete confirmation
    const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
    if (confirmDeleteBtn) {
        confirmDeleteBtn.addEventListener('click', performDeleteJob);
    }

    // Set up event listeners for modal close buttons
    const deleteModal = document.getElementById('deleteConfirmationModal');
    if (deleteModal) {
        // Update close button for Bootstrap 5
        const closeButtons = deleteModal.querySelectorAll('[data-dismiss="modal"]');
        closeButtons.forEach(button => {
            button.setAttribute('data-bs-dismiss', 'modal');
            button.removeAttribute('data-dismiss');
        });

        // Clear jobToDelete when modal is hidden
        deleteModal.addEventListener('hidden.bs.modal', () => {
            jobToDelete = null;
        });
    }

    const searchInput = document.querySelector('.search-input');
    if (searchInput) {
        searchInput.addEventListener('input', handleSearch);
    }

});



// Fixed handleJobSubmission function with correct modal closing
async function handleJobSubmission(event) {
    event.preventDefault();
    
    try {
        const user = auth.currentUser;
        if (!user) {
            alert('User must be logged in to manage jobs');
            return;
        }

        const postcode = document.getElementById('postcode').value;
        if (!/^\d{5}$/.test(postcode)) {
            alert('Postcode must be a 5-digit integer');
            return;
        }

        const jobEmail = document.getElementById('job-email').value;
        if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(jobEmail)) {
            alert('Please enter a valid email address');
            return;
        }
        
        const environmentEntries = document.querySelectorAll('.environment-entry');
        const environments = [];
        let isValid = true;

        environmentEntries.forEach((entry, index) => {
            const placeName = entry.querySelector('input[placeholder="Place Name"]')?.value?.trim();
            const arLink = entry.querySelector('input[placeholder="AR Link"]')?.value?.trim();
            const momentoLink = entry.querySelector('input[placeholder="Momento Link"]')?.value?.trim();
            
            // Skip empty entries
            if (!placeName && !arLink && !momentoLink) {
                return;
            }

            // If any field is filled, validate the entry
            if (placeName || arLink || momentoLink) {
                // Validate place name only if either link is provided
                if ((arLink || momentoLink) && !placeName) {
                    alert(`Place Name is required if providing links for environment #${index + 1}`);
                    isValid = false;
                    return;
                }

                // Add to environments array if valid
                environments.push({
                    placeName: placeName || '',
                    arLink: arLink || '',
                    momentoLink: momentoLink || ''
                });
            }
        });

        if (!isValid) {
            return;
        }


        const jobData = {
            title: document.getElementById('job-title').value,
            description: document.getElementById('job-description').value,
            requirements: Array.from(selectedRequirements),
            hiredPax: parseInt(document.getElementById('hired-pax').value),
            preferredQualification: document.getElementById('preferred-qualification').value,
            allowance: document.getElementById('job-allowance').value,
            location: {
                no: document.getElementById('no').value,
                road: document.getElementById('road').value,
                postcode: document.getElementById('postcode').value,
                city: document.getElementById('city').value,
                state: document.getElementById('state').value
            },
            email: document.getElementById('job-email').value,
            phone: document.getElementById('job-phone').value,
            status: document.getElementById('job-status').value,
            postedDate: Timestamp.now(),
            postedBy: user.uid,
            companyEnvironments: environments// employerId
        };
        
        const employerId = user.uid; // Current employer ID
        const jobsCollection = collection(db, 'jobs');
        
        // Check if this is an update or new job creation
        if (event.target.dataset.jobId) {
            // Update existing job
            const jobId = event.target.dataset.jobId;
            const jobRef = doc(db, 'jobs', jobId);
            jobData.updateDate = Timestamp.now(); // Update timestamp
        
            await updateDoc(jobRef, jobData);
        
            // Ensure the jobId is in the employer's document
            const employerRef = doc(db, 'employers', employerId);
            await updateDoc(employerRef, {
                jobIds: arrayUnion(jobId) // Add jobId if it doesn't already exist
            });
        
            alert('Job updated successfully!');
        } else {
            // Create new job
            const newJobRef = await addDoc(jobsCollection, jobData); // Add job to "jobs" collection
            const newJobId = newJobRef.id;
        
            // Add jobId to employer's document
            const employerRef = doc(db, 'employers', employerId);
            await updateDoc(employerRef, {
                jobIds: arrayUnion(newJobId) // Add new jobId to employer's jobIds
            });
        
            alert('Job created successfully!');
        }
        
        
        // Clear form and close modal
        clearAllInputs();
        $('#createJobModal').modal('hide');  // Using jQuery to close the modal
        
        // Reset form state
        document.getElementById('createJobModalLabel').textContent = 'Create Job Listing';
        const submitButton = document.querySelector('#jobForm button[type="submit"]');
        if (submitButton) {
            submitButton.textContent = 'Create';
        }
        delete event.target.dataset.jobId;
        
        // Reset requirements
        selectedRequirements = new Set();
        updateRequirementsList();
        
        // Reload jobs list
        loadUserJobs();
        
    } catch (error) {
        console.error('Error managing job:', error);
        alert('Error managing job. Please try again.');
    }
}

// Modify the loadUserJobs function
async function loadUserJobs() {
    try {
        const user = auth.currentUser;

        // Ensure the user is authenticated
        if (!user) {
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        if (!auth.currentUser) {
            console.log('Could not get current user');
            return;
        }

        const jobsContainer = document.getElementById('jobsList');
        if (!jobsContainer) {
            console.error('Jobs container not found');
            return;
        }

        // Show loading state
        jobsContainer.innerHTML = `
            <div class="alert alert-info" role="alert">
                <div class="d-flex align-items-center">
                    <div class="spinner-border spinner-border-sm me-2" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                    Loading your job listings...
                </div>
            </div>
        `;

        try {
            // Reference the jobs collection
            const jobsRef = collection(db, 'jobs');  // Corrected line
        
            // Query to fetch jobs where employerId matches the authenticated user
            const jobsQuery = query(jobsRef, where('postedBy', '==', auth.currentUser.uid), orderBy('postedDate', 'desc'));
            const querySnapshot = await getDocs(jobsQuery);
        
            // Reset pagination when loading new data
            currentPage = 1;
            displayJobs(querySnapshot, jobsContainer);
        
        } catch (queryError) {
            if (queryError.code === 'failed-precondition' || queryError.message.includes('requires an index')) {
                console.log('Falling back to simple query while index is being built...');
                // Fallback query: Get jobs without ordering
                const jobsQuery = query(collection(db, 'jobs'), where('postedBy', '==', auth.currentUser.uid));
                const querySnapshot = await getDocs(jobsQuery);
                displayJobs(querySnapshot, jobsContainer);
            } else {
                console.error('Error in query execution:', queryError);
                throw queryError;
            }
        }
        
    } catch (error) {
        console.error('Error loading jobs:', error);
        handleLoadError(error);
    }
}



async function updateJobStatus(jobId, newStatus) {
    try {
        const user = auth.currentUser;
        if (!user) {
            alert('User must be logged in to update job status');
            return;
        }

        // Reference the specific job document
        const jobRef = doc(db, 'jobs', jobId);
        
        // Update the job's status
        await updateDoc(jobRef, {
            status: newStatus
        });

        // Reload the jobs list to reflect the updated status
        loadUserJobs();
        
        alert(`Job ${newStatus === 'active' ? 'activated' : 'hidden'} successfully`);
    } catch (error) {
        console.error('Error updating job status:', error);
        alert('Error updating job status. Please try again.');
    }
}


// Replace the original deleteJob function with this new version
function deleteJob(jobId, jobTitle) {
    showDeleteConfirmationModal(jobId, jobTitle);
}

// Modified displayJobs function
function displayJobs(querySnapshot, jobsContainer) {
    if (!jobsContainer) return;
    
    // If querySnapshot is provided, update both filteredJobs and originalJobs
    if (querySnapshot) {
        const jobs = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })).sort((a, b) => b.postedDate.seconds - a.postedDate.seconds);
        
        filteredJobs = jobs;
        originalJobs = jobs; // Store original jobs
    }

    // If search is empty, use original jobs
    const jobsToFilter = searchQuery.trim() === '' ? originalJobs : filteredJobs;

    // Filter jobs based on search query
    const filtered = jobsToFilter.filter(job => {
        const searchIn = [
            job.title,
            job.description,
            job.location.city,
            job.location.state,
            job.status,
            job.email,
            job.phone,
            ...(job.requirements || [])
        ].map(item => (item || '').toLowerCase()).join(' ');
        return searchIn.includes(searchQuery.toLowerCase());
    });

    // Calculate pagination
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedJobs = filtered.slice(startIndex, endIndex);

    // Update jobs display
    if (filtered.length === 0) {
        jobsContainer.innerHTML = `
            <div class="card text-center">
                <div class="card-body">
                    <i class="bi bi-clipboard-x fs-1 text-muted"></i>
                    <p class="card-text text-muted">
                        ${searchQuery ? 'No jobs match your search criteria.' : 'No jobs posted yet. Click the "Create Job" button to post your first job.'}
                    </p>
                </div>
            </div>
        `;
    } else {
        jobsContainer.innerHTML = '';
        paginatedJobs.forEach((job) => {
            const jobDate = job.postedDate.toDate();
            const card = document.createElement('div');
            card.className = 'card mb-4';
            card.innerHTML = `
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-center mb-3">
                        <span class="badge bg-${job.status === 'active' ? 'success' : 'secondary'}">
                            <i class="bi bi-${job.status === 'active' ? 'broadcast' : 'eye-slash'}"></i>
                            ${job.status}
                        </span>
                        <small class="text-muted">
                            <i class="bi bi-calendar3"></i>
                            ${jobDate.toLocaleDateString()}
                        </small>
                    </div>
                    <h5 class="card-title text-primary mb-3">${job.title}</h5>
                    <div class="mb-3">
                        <div class="d-flex align-items-center text-muted mb-2">
                            <i class="bi bi-geo-alt me-2"></i>
                            <small>${job.location.city}, ${job.location.state}</small>
                        </div>
                        <div class="d-flex align-items-center text-muted mb-2">
                            <i class="bi bi-currency-dollar me-2"></i>
                            <small>MYR ${job.allowance}</small>
                        </div>
                        <div class="d-flex align-items-center text-muted mb-2">
                            <i class="bi bi-people me-2"></i>
                            <small>${job.hiredPax} positions</small>
                        </div>
                        <div class="d-flex align-items-center text-muted mb-2">
                            <i class="bi bi-envelope me-2"></i>
                            <small>${job.email}</small>
                        </div>
                        <div class="d-flex align-items-center text-muted mb-2">
                            <i class="bi bi-phone me-2"></i>
                            <small>${job.phone}</small>
                        </div>
                        
                    </div>
                    <p class="card-text mb-3 text-truncate-2 text-justify">
                        ${job.description}
                    </p>
                    <div class="requirements-container mb-3" id="requirements-${job.id}">
                        <small class="text-muted d-block mb-2">Requirements:</small>
                        <div class="d-flex flex-wrap gap-2 requirements-preview">
                            ${job.requirements.slice(0, 3).map(req => `
                                <span class="badge bg-light text-dark">${req}</span>
                            `).join('')}
                        </div>
                        ${job.requirements.length > 3 ? `
                            <div class="d-none additional-requirements">
                                ${job.requirements.slice(3).map(req => `
                                    <span class="badge bg-light text-dark">${req}</span>
                                `).join('')}
                            </div>
                            <button class="btn btn-link p-0 text-primary d-inline-flex align-items-center show-more-btn" onclick="toggleRequirements('${job.id}')">
                                <span>Show more</span>
                                <i class="bi bi-chevron-down ms-2"></i>
                            </button>
                        ` : ''}
                    </div>
                    <div class="d-flex justify-content-end">
                        <button class="btn btn-outline-primary btn-sm me-2" onclick="editJob('${job.id}')">
                            <i class="bi bi-pencil me-2"></i>
                            Edit
                        </button>
                        <button class="btn btn-outline-${job.status === 'active' ? 'warning' : 'success'} btn-sm me-2" 
                                onclick="updateJobStatus('${job.id}', '${job.status === 'active' ? 'hidden' : 'active'}')">
                            <i class="bi bi-${job.status === 'active' ? 'eye-slash' : 'eye'} me-2"></i>
                            ${job.status === 'active' ? 'Hide' : 'Show'}
                        </button>
                        <button class="btn btn-outline-danger btn-sm" onclick="deleteJob('${job.id}', '${job.title.replace(/'/g, "\\'")}')">
                            <i class="bi bi-trash me-2"></i>
                            Delete
                        </button>
                    </div>
                </div>
            `;
            jobsContainer.appendChild(card);
        });
    }

    // Create pagination
    createPagination(filtered.length);
}
  
function toggleRequirements(jobId) {
    const requirementsContainer = document.getElementById(`requirements-${jobId}`);
    const moreRequirementsButton = requirementsContainer.querySelector('.show-more-btn');
    const additionalRequirements = requirementsContainer.querySelector('.additional-requirements');
    const requirementsPreview = requirementsContainer.querySelector('.requirements-preview');

    if (requirementsContainer && moreRequirementsButton && additionalRequirements && requirementsPreview) {
        // Toggle the visibility of the additional requirements
        additionalRequirements.classList.toggle('d-none');

        // Toggle the text and chevron icon on the "Show more/less" button
        moreRequirementsButton.querySelector('span').textContent = additionalRequirements.classList.contains('d-none') ? 'Show more' : 'Show less';
        moreRequirementsButton.querySelector('i').classList.toggle('bi-chevron-down');
        moreRequirementsButton.querySelector('i').classList.toggle('bi-chevron-up');

        // Toggle the visibility of the requirements preview
        requirementsPreview.classList.toggle('d-none', !additionalRequirements.classList.contains('d-none'));
    }
}

async function editJob(jobId) {
    try {
        const user = auth.currentUser;
        if (!user) {
            alert('User must be logged in to edit jobs');
            return;
        }

        // Fetch the job data from the updated structure (no nested employerJobs collection)
        const jobRef = doc(db, 'jobs', jobId);  // Directly reference the job by jobId
        const docSnapshot = await getDoc(jobRef);
        
        if (docSnapshot.exists()) {
            const jobData = docSnapshot.data();
            
            // Populate the form with existing data
            document.getElementById('job-title').value = jobData.title || '';
            document.getElementById('job-description').value = jobData.description || '';
            document.getElementById('hired-pax').value = jobData.hiredPax || '';
            document.getElementById('preferred-qualification').value = jobData.preferredQualification || '';
            document.getElementById('job-allowance').value = jobData.allowance || '';
            document.getElementById('no').value = jobData.location?.no || '';
            document.getElementById('road').value = jobData.location?.road || '';
            document.getElementById('postcode').value = jobData.location?.postcode || '';
            document.getElementById('city').value = jobData.location?.city || '';
            document.getElementById('state').value = jobData.location?.state || '';
            document.getElementById('job-email').value = jobData.email || '';
            document.getElementById('job-phone').value = jobData.phone || '';
            document.getElementById('job-status').value = jobData.status || 'active';
            
            // Set the requirements
            if (jobData.requirements && Array.isArray(jobData.requirements)) {
                selectedRequirements = new Set(jobData.requirements);
                updateRequirementsList();
            } else {
                selectedRequirements = new Set();
                updateRequirementsList();
            }
            
            // Handle company environments
            const environmentsContainer = document.getElementById('company-environments-container');
            environmentsContainer.innerHTML = ''; // Clear existing entries
            
            if (jobData.companyEnvironments && jobData.companyEnvironments.length > 0) {
                jobData.companyEnvironments.forEach(env => {
                    const envEntry = document.createElement('div');
                    envEntry.className = 'environment-entry';
                    envEntry.innerHTML = `
                        <div class="row">
                            <div class="col-md-3">
                                <div class="place-name-container">
                                    <input type="text" class="form-control" placeholder="Place Name" value="${env.placeName || ''}" required>
                                </div>
                            </div>
                            <div class="col-md-7">
                                <div class="link-container">
                                    <div class="link-row ar-link-row">
                                        <input type="text" class="form-control" placeholder="AR Link" value="${env.arLink || ''}">
                                        <button type="button" class="btn btn-outline-danger delete-link-btn delete-ar-link">
                                            <i class="bi bi-trash"></i>
                                        </button>
                                    </div>
                                    <div class="link-row momento-link-row">
                                        <input type="text" class="form-control" placeholder="Momento Link" value="${env.momentoLink || ''}">
                                        <button type="button" class="btn btn-outline-danger delete-link-btn delete-momento-link">
                                            <i class="bi bi-trash"></i>
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <div class="col-md-2 text-right">
                                <div class="btn-container">
                                    <button type="button" class="btn btn-outline-danger delete-environment">
                                        <i class="bi bi-trash"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                    `;
                    environmentsContainer.appendChild(envEntry);
                });
            }

            // Show the modal
            const modal = new bootstrap.Modal(document.getElementById('createJobModal'));
            modal.show();
            
            // Update the modal title and submit button
            document.getElementById('createJobModalLabel').textContent = 'Update Job Listing';
            const submitButton = document.querySelector('#jobForm button[type="submit"]');
            if (submitButton) {
                submitButton.textContent = 'Update';
            }
            
            // Store the job ID for the update operation
            document.getElementById('jobForm').dataset.jobId = jobId;
        } else {
            alert('Job not found');
        }
    } catch (error) {
        console.error('Error fetching job data:', error);
        alert('Error loading job data. Please try again.');
    }
}


// Variable to store the job information for deletion
let jobToDelete = null;

// Function to show delete confirmation modal
function showDeleteConfirmationModal(jobId, jobTitle) {
    // Store job information for deletion
    jobToDelete = {
        id: jobId,
        title: jobTitle
    };

    // Set the job title in the modal
    const titleSpan = document.getElementById('deleteModalJobTitle');
    if (titleSpan) {
        titleSpan.textContent = jobTitle;
    }

    // Show the modal using Bootstrap modal
    const deleteModal = new bootstrap.Modal(document.getElementById('deleteConfirmationModal'));
    deleteModal.show();
}

// Function to perform the actual deletion
async function performDeleteJob() {
    if (!jobToDelete) return;

    try {
        const user = auth.currentUser;
        if (!user) {
            alert('User must be logged in to delete jobs');
            return;
        }

        // Reference to the specific job document in the 'jobs' collection
        const jobRef = doc(db, 'jobs', jobToDelete.id);

        // Reference to the employer document in the 'employers' collection
        const employerRef = doc(db, 'employers', user.uid);

        // Fetch the employer document
        const employerDoc = await getDoc(employerRef);

        if (employerDoc.exists()) {
            // Remove the job ID from the employer's job list
            const employerData = employerDoc.data();
            const jobIds = employerData.jobIds || [];

            // Remove the deleted job's ID from the job list (if it exists)
            const updatedJobIds = jobIds.filter(id => id !== jobToDelete.id);

            // Update the employer document with the new job list
            await updateDoc(employerRef, {
                jobIds: updatedJobIds
            });
        } else {
            console.log('Employer document not found');
        }

        // Delete the job document from the 'jobs' collection
        await deleteDoc(jobRef);

        // Hide the modal
        const deleteModal = bootstrap.Modal.getInstance(document.getElementById('deleteConfirmationModal'));
        if (deleteModal) {
            deleteModal.hide();
        }

        // Clear the jobToDelete
        jobToDelete = null;

        // Reload the jobs list and show success message
        loadUserJobs();
        alert('Job deleted successfully');

    } catch (error) {
        console.error('Error deleting job:', error);
        alert('Error deleting job. Please try again.');
    }
}


// Global variables
let currentPage = 1;
const itemsPerPage = 5;
let filteredJobs = [];
let searchQuery = '';
let originalJobs = []; // Store the original jobs

// Modified handleSearch function
function handleSearch(event) {
    const newSearchQuery = event.target.value.toLowerCase();
    const jobsContainer = document.getElementById('jobsList');
    
    if (!jobsContainer) return;

    // Update search query
    searchQuery = newSearchQuery;

    // If search is cleared, restore original jobs
    if (!searchQuery.trim()) {
        filteredJobs = originalJobs;
        currentPage = 1;
        displayJobs(null, jobsContainer);
        return;
    }

    // Filter jobs based on search query
    filteredJobs = originalJobs.filter(job => {
        const searchIn = [
            job.title,
            job.description,
            job.location.city,
            job.location.state,
            job.status,
            ...(job.requirements || [])
        ].map(item => (item || '').toLowerCase()).join(' ');
        return searchIn.includes(searchQuery);
    });

    

    // Stay on current page if there are enough results
    const totalPages = Math.ceil(filteredJobs.length / itemsPerPage);
    if (currentPage > totalPages) {
        currentPage = totalPages || 1;
    }

    displayJobs(null, jobsContainer);
}

// Add new function for pagination
function createPagination(totalItems) {
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const paginationContainer = document.getElementById('paginationContainer');
    
    if (!paginationContainer) return;
    
    let paginationHTML = `
        <nav aria-label="Job listings pagination">
            <ul class="pagination justify-content-center">
                <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
                    <a class="page-link" href="#" onclick="changePage(${currentPage - 1})" aria-label="Previous">
                        <span aria-hidden="true">&laquo;</span>
                    </a>
                </li>
    `;

    for (let i = 1; i <= totalPages; i++) {
        paginationHTML += `
            <li class="page-item ${currentPage === i ? 'active' : ''}">
                <a class="page-link" href="#" onclick="changePage(${i})">${i}</a>
            </li>
        `;
    }

    paginationHTML += `
                <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
                    <a class="page-link" href="#" onclick="changePage(${currentPage + 1})" aria-label="Next">
                        <span aria-hidden="true">&raquo;</span>
                    </a>
                </li>
            </ul>
        </nav>
    `;

    paginationContainer.innerHTML = paginationHTML;
}

// Add function to change page
function changePage(newPage) {
    if (newPage < 1 || newPage > Math.ceil(filteredJobs.length / itemsPerPage)) return;
    currentPage = newPage;
    displayJobs(null, document.getElementById('jobsList'));
}


function initializeCompanyEnvironment() {
    // Only initialize if we're on the create/edit job page
    const container = document.getElementById('company-environments-container');
    const addButton = document.getElementById('add-environment');
    const createArButton = document.getElementById('create-ar-btn');
    const momentoButton = document.getElementById('momento-btn');
    
    if (!container || !addButton || !createArButton || !momentoButton) {
        return;
    }

    // Create AR button click handler
    createArButton.addEventListener('click', function() {
        // Replace this URL with your actual AR creation tool URL
        window.open('https://mywebar.com/?utm_term&utm_campaign=Website%20traffic-20%20Tips%20for%20Pack%20-%20South%20Korea%2C%20Japan&utm_source=adwords&utm_medium=ppc&hsa_acc=7594954242&hsa_cam=20434084524&hsa_grp&hsa_ad&hsa_src=x&hsa_tgt&hsa_kw&hsa_mt&hsa_net=adwords&hsa_ver=3&gad_source=1&gclid=CjwKCAiA-Oi7BhA1EiwA2rIu2xGKZ6FD0k0tbIQkSPvU1j8g8iGGYBZ7DsrTMV-zTqxxxt6X8cO0FRoCKDgQAvD_BwE', '_blank');
    });

     // Momento360 button click handler
     momentoButton.addEventListener('click', function() {
        window.open('https://momento360.com/', '_blank');
    });


    // Add new environment entry
    function createEnvironmentEntry() {
        const newEntry = document.createElement('div');
        newEntry.className = 'environment-entry';
        newEntry.innerHTML = `
            <div class="row">
            <div class="col-md-3">
                <div class="place-name-container">
                    <input type="text" class="form-control" placeholder="Place Name">
                </div>
            </div>
            <div class="col-md-7">
                <div class="link-container">
                    <div class="link-row ar-link-row">
                        <input type="text" class="form-control" placeholder="AR Link">
                        <button type="button" class="btn btn-outline-danger delete-link-btn delete-ar-link">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                    <div class="link-row momento-link-row">
                        <input type="text" class="form-control" placeholder="Momento Link">
                        <button type="button" class="btn btn-outline-danger delete-link-btn delete-momento-link">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
            <div class="col-md-2 text-right">
                <div class="btn-container">
                    <button type="button" class="btn btn-outline-danger delete-environment">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </div>
        </div>
        `;
        return newEntry;
    }

    // Add new environment entry
    addButton.addEventListener('click', function() {
        const newEntry = createEnvironmentEntry();
        container.appendChild(newEntry);
    });
    
    container.addEventListener('click', function(e) {
        // Delete entire environment
        if (e.target.closest('.delete-environment')) {
            const entry = e.target.closest('.environment-entry');
            if (confirm('Are you sure you want to delete this environment?')) {
                entry.remove();
            }
            return;
        }

    // Delete AR link
    if (e.target.closest('.delete-ar-link')) {
        const entry = e.target.closest('.environment-entry');
        const arLinkRow = entry.querySelector('.ar-link-row');
        const momentoLinkRow = entry.querySelector('.momento-link-row input');
        
        // Check if Momento link exists and has a value
        if (!momentoLinkRow || !momentoLinkRow.value.trim()) {
            alert('At least one link (AR or Momento) is required');
            return;
        }
        
        if (confirm('Are you sure you want to delete the AR link?')) {
            const linkContainer = entry.querySelector('.link-container');
            const arLinkRowElement = entry.querySelector('.ar-link-row');
            if (arLinkRowElement) {
                arLinkRowElement.remove(); // Remove the entire AR link row
            }
        }
        return;
    }

    // Delete Momento link
    if (e.target.closest('.delete-momento-link')) {
        const entry = e.target.closest('.environment-entry');
        const arLinkRow = entry.querySelector('.ar-link-row input');
        
        // Check if AR link exists and has a value
        if (!arLinkRow || !arLinkRow.value.trim()) {
            alert('At least one link (AR or Momento) is required');
            return;
        }
        
        if (confirm('Are you sure you want to delete the Momento link?')) {
            const momentoLinkRowElement = entry.querySelector('.momento-link-row');
            if (momentoLinkRowElement) {
                momentoLinkRowElement.remove(); // Remove the entire Momento link row
            }
        }
    }
});


    // Edit environment entry
    container.addEventListener('click', function(e) {
        const editButton = e.target.closest('.edit-environment');
        if (editButton) {
            const entry = editButton.closest('.environment-entry');
            const inputs = entry.querySelectorAll('input');
            inputs.forEach(input => {
                input.removeAttribute('readonly');
                input.focus();
            });
        }
    });
}

// Export functions to window object
Object.assign(window, {
    handleFieldSelection,
    addCustomRequirement,
    removeRequirement,
    addSelectedRequirements,
    closeRequirementsModal,
    createJob,
    clearAllInputs,
    handleJobSubmission,
    loadUserJobs,
    toggleRequirements,
    updateJobStatus,
    editJob,
    deleteJob,
    showDeleteConfirmationModal,
    performDeleteJob,
    toggleRequirementHighlight,
    handleSearch,
    changePage
});