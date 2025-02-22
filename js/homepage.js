import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js";
import { getFirestore, doc, getDoc, query, collection, where, getDocs, orderBy, limit, startAfter  } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";

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
const auth = getAuth(app);
const db = getFirestore(app);

// Status colors for UI
const STATUS_COLORS = {
    'Hired (Accepted)': { icon: '#2ecc71', background: '#c2ff9e' },
    'Approved': { icon: '#27ae60', background: '#e8f5e9' },
    'Shortlisted': { icon: '#f39c12', background: '#fff3e0' },
    'Pending': { icon: '#3498db', background: '#e3f2fd' },
    'Rejected': { icon: '#e74c3c', background: '#fcc7c2' },
    'Declined': { icon: '#e74c3c', background: '#fdedec' },
    'Withdrawn': { icon: '#95a5a6', background: '#f2f4f4' }
};



async function fetchJobApplicationData(user) {
    try {
        if (!user || !user.uid) {
            throw new Error("User object is undefined or missing UID.");
        }

        const employerRef = doc(db, 'employers', user.uid);
        const employerSnap = await getDoc(employerRef);

        if (!employerSnap.exists()) {
            console.error('Employer document not found for UID:', user.uid);
            return;
        }

        const employerData = employerSnap.data();
        const jobIds = employerData.jobIds || [];

        const applicationStatuses = [];

        // Loop through job IDs to fetch application data
        for (const jobId of jobIds) {
            const jobRef = doc(db, 'jobs', jobId);
            const jobSnap = await getDoc(jobRef);

            if (jobSnap.exists()) {
                const applicationIds = jobSnap.data().applicationIds || [];

                for (const applicationId of applicationIds) {
                    const applicationRef = doc(db, 'applications', jobId, 'applicants', applicationId);
                    const applicationSnap = await getDoc(applicationRef);

                    if (applicationSnap.exists()) {
                        const status = applicationSnap.data().status;
                        
                        // Log the status to help diagnose issues
                        console.log(`Found application status: ${status}`);
                        
                        applicationStatuses.push({
                            status: status || 'Unknown',
                            count: 1
                        });
                    }
                }
            }
        }

        // Aggregate status counts
        const statusCounts = applicationStatuses.reduce((acc, curr) => {
            // Normalize status names if needed
            const normalizedStatus = normalizeStatus(curr.status);
            acc[normalizedStatus] = (acc[normalizedStatus] || 0) + 1;
            return acc;
        }, {});

        // Update the UI with status counts
        updateStatusUI(statusCounts);
        createStatusPieChart(statusCounts);
    } catch (error) {
        console.error("Error fetching job application data:", error);
    }
}

// Helper function to normalize status names
function normalizeStatus(status) {
    // Map various status representations to a consistent format
    const statusMap = {
        'Accepted': 'Hired (Accepted)',
        'accepted': 'Hired (Accepted)',
        'ACCEPTED': 'Hired (Accepted)',
        // Add more mappings as needed
    };

    return statusMap[status] || status;
}

// Update the status UI
function updateStatusUI(statusCounts) {
    const statusContainer = document.querySelector('.status-container');
    statusContainer.innerHTML = '';

    // Dynamically get unique statuses from the data
    const allStatuses = new Set([
        ...Object.keys(statusCounts),
        'Hired (Accepted)', 'Approved', 'Shortlisted', 
        'Pending', 'Rejected', 'Declined', 'Withdrawn'
    ]);

    // Sort statuses with a preference for the predefined order
    const statusOrder = [
        'Hired (Accepted)', 'Approved',
        'Shortlisted', 'Pending',
        'Rejected', 'Declined', 'Withdrawn'
    ];

    const sortedStatuses = [...allStatuses].sort((a, b) => {
        const aIndex = statusOrder.indexOf(a);
        const bIndex = statusOrder.indexOf(b);
        
        if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
        if (aIndex !== -1) return -1;
        if (bIndex !== -1) return 1;
        return a.localeCompare(b);
    });

    sortedStatuses.forEach(status => {
        const count = statusCounts[status] || 0;
        const statusColors = STATUS_COLORS[status] || { icon: '#666', background: '#f1f1f1' };

        const statusItem = document.createElement('div');
        statusItem.classList.add('status-item');
        statusItem.style.backgroundColor = statusColors.background;

        const statusIcon = document.createElement('div');
        statusIcon.classList.add('status-icon');
        statusIcon.innerHTML = getStatusIcon(status);
        statusIcon.style.color = statusColors.icon;

        const statusText = document.createElement('div');
        statusText.classList.add('status-text');
        statusText.textContent = status;

        const statusCount = document.createElement('div');
        statusCount.classList.add('status-count');
        statusCount.textContent = count;
        statusCount.style.color = statusColors.icon;

        statusItem.appendChild(statusIcon);
        statusItem.appendChild(statusText);
        statusItem.appendChild(statusCount);

        statusContainer.appendChild(statusItem);
    });
}

let currentChart = null; 

// Create status pie chart
function createStatusPieChart(statusCounts) {
    // Destroy existing chart if it exists
    if (currentChart) {
        currentChart.destroy();
    }

    if (typeof Chart === 'undefined') {
        console.error('Chart.js is not loaded');
        return;
    }

    let chartContainer = document.getElementById('chart-container');
    if (!chartContainer) {
        chartContainer = document.createElement('div');
        chartContainer.id = 'chart-container';
        chartContainer.className = 'chart-container';
        const canvas = document.createElement('canvas');
        canvas.id = 'statusPieChart';
        chartContainer.appendChild(canvas);
    }

    const ctx = document.getElementById('statusPieChart').getContext('2d');
    
    const statusOrder = [
        'Hired (Accepted)', 'Approved',
        'Shortlisted', 'Pending',
        'Rejected', 'Declined', 'Withdrawn'
    ];

    const filteredStatuses = statusOrder.filter(status => statusCounts[status] > 0);
    
    currentChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: filteredStatuses,
            datasets: [{
                data: filteredStatuses.map(status => statusCounts[status]),
                backgroundColor: filteredStatuses.map(status => 
                    STATUS_COLORS[status]?.icon || '#666'
                )
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: { padding: 10 },
            plugins: {
                title: {
                    display: true,
                    text: 'Pie Chart - Application Status',
                    font: { size: 16, weight: 'bold' }
                },
                legend: {
                    position: 'right',
                    labels: { font: { size: 12 }, padding: 10 }
                }
            }
        }
    });
}
// Get status icon based on the status
function getStatusIcon(status) {
    switch (status) {
        case 'Hired (Accepted)':
        case 'Approved':
            return '<i class="fas fa-check"></i>';
        case 'Shortlisted':
        case 'Pending':
            return '<i class="fas fa-hourglass-half"></i>';
        case 'Rejected':
        case 'Declined':
        case 'Withdrawn':
            return '<i class="fas fa-times"></i>';
        default:
            return '';
    }
}

let currentPage = 1;
const APPLICATIONS_PER_PAGE = 4;
let lastVisibleDoc = null;
let totalApplications = 0;

async function fetchPendingAndShortlistedApplications(user) {
    try {
        // Validate user
        if (!user || !user.uid) {
            throw new Error("Invalid user authentication");
        }

        // 1. Fetch employer's job IDs
        const employerRef = doc(db, 'employers', user.uid);
        const employerSnap = await getDoc(employerRef);

        if (!employerSnap.exists()) {
            throw new Error('Employer profile not found');
        }

        const jobIds = employerSnap.data().jobIds || [];

        // If no jobs, return empty result
        if (jobIds.length === 0) {
            return [];
        }

        // Prepare to store final applications
        const applicationsPromises = jobIds.map(async (jobId) => {
            // 2. Fetch job details
            const jobRef = doc(db, 'jobs', jobId);
            const jobSnap = await getDoc(jobRef);

            if (!jobSnap.exists()) {
                console.warn(`Job ${jobId} not found`);
                return [];
            }

            const jobTitle = jobSnap.data().title;
            const applicationIds = jobSnap.data().applicationIds || [];

            // 3. Fetch applications for each job
            const jobApplicationsPromises = applicationIds.map(async (applicationId) => {
                // 4. Fetch specific application details
                const applicationRef = doc(db, 'applications', jobId, 'applicants', applicationId);
                const applicationSnap = await getDoc(applicationRef);

                if (!applicationSnap.exists()) {
                    return null;
                }

                const applicationData = applicationSnap.data();

                // Filter for Pending and Shortlisted statuses
                if (['Pending', 'Shortlisted'].includes(applicationData.status)) {
                    return {
                        id: applicationId,
                        jobTitle: jobTitle,
                        studentName: applicationData.studentName,
                        status: applicationData.status,
                        appliedAt: applicationData.appliedAt
                    };
                }

                return null;
            });

            // Resolve and filter out null values
            return (await Promise.all(jobApplicationsPromises)).filter(app => app !== null);
        });

        // Resolve all promises and flatten the results
        const applications = (await Promise.all(applicationsPromises)).flat();

        // Sort applications by most recent first
        applications.sort((a, b) => b.appliedAt - a.appliedAt);

        return applications;

    } catch (error) {
        console.error("Error fetching applications:", error);
        throw error;
    }
}

function updateApplicationsTable(applications) {
    const tableBody = document.getElementById('applicationsTableBody');
    tableBody.innerHTML = '';

    if (!applications || applications.length === 0) {
        // Handle empty state
        tableBody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center">No applications found</td>
            </tr>
        `;
        return;
    }

    applications.forEach(application => {
        // Ensure we have the correct properties
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${application.studentName || application.applicantName || 'N/A'}</td>
            <td>${application.jobTitle || 'N/A'}</td>
            <td>${formatDate(application.appliedAt)}</td>
            <td>${application.status || 'N/A'}</td>
        `;
        tableBody.appendChild(row);
    });
}

// Add event listener for the global Manage Applications button
document.getElementById('manageApplicationsBtn').addEventListener('click', () => {
    window.location.href = '/manageapp.html';
});

// Utility function to format dates (if not already defined)
function formatDate(timestamp) {
    if (!timestamp) return 'N/A';
    
    // Convert Firestore timestamp to readable date
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function updatePaginationButtons() {
    const prevBtn = document.getElementById('prevApplicationsBtn');
    const nextBtn = document.getElementById('nextApplicationsBtn');
    const pageInfo = document.getElementById('pageInfo');

    prevBtn.disabled = currentPage === 1;
    nextBtn.disabled = currentPage * APPLICATIONS_PER_PAGE >= totalApplications;

    pageInfo.textContent = `Page ${currentPage} of ${Math.ceil(totalApplications / APPLICATIONS_PER_PAGE)}`;
}

onAuthStateChanged(auth, async (user) => {
    if (user) {
        try {
            // Fetch job application status data
            await fetchJobApplicationData(user);
            await fetchJobStatusCounts(user);
            // Fetch applications
            const applications = await fetchPendingAndShortlistedApplications(user);
            
            // Update total applications for pagination
            totalApplications = applications.length;
            
            // Update table with first page of results
            const paginatedApplications = applications.slice(0, APPLICATIONS_PER_PAGE);
            updateApplicationsTable(paginatedApplications);
            
            // Update pagination buttons
            updatePaginationButtons();

            const jobApplicantsData = await fetchJobApplicantDataFromFirebase(user);
            // Create the bar chart
            createJobApplicantsBarChart(jobApplicantsData);
            
            // Add event listeners for pagination
            document.getElementById('prevApplicationsBtn').addEventListener('click', async () => {
                if (currentPage > 1) {
                    currentPage--;
                    await fetchPreviousApplications(user);
                }
            });

            document.getElementById('nextApplicationsBtn').addEventListener('click', async () => {
                if (currentPage * APPLICATIONS_PER_PAGE < totalApplications) {
                    currentPage++;
                    await fetchNextApplications(user);
                }
            });

            const jobListings = await fetchJobListingsData(user);
            totalJobListings = jobListings.length;
            const paginatedJobListings = jobListings.slice(0, JOB_LISTINGS_PER_PAGE);
            updateJobListingsTable(paginatedJobListings);
            updateJobListingsPaginationButtons();


            // Add event listeners for pagination
            document.getElementById('prevJobListingsBtn').addEventListener('click', async () => {
                if (currentJobListingsPage > 1) {
                    currentJobListingsPage--;
                    await fetchPreviousJobListings(user);
                }
            });

            document.getElementById('nextJobListingsBtn').addEventListener('click', async () => {
                if (currentJobListingsPage * JOB_LISTINGS_PER_PAGE < totalJobListings) {
                    currentJobListingsPage++;
                    await fetchNextJobListings(user);
                }
            });
        } catch (error) {
            console.error("Failed to fetch applications:", error);
            const tableBody = document.getElementById('applicationsTableBody');
            tableBody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center text-danger">
                        Error loading applications: ${error.message}
                    </td>
                </tr>
            `;

            const jobListingsTableBody = document.getElementById('jobListingsTableBody');
            jobListingsTableBody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center text-danger">
                        Error loading job listings: ${error.message}
                    </td>
                </tr>
            `;
        }
    } else {
        console.error("No authenticated user. Please log in.");
    }
});

async function fetchNextApplications(user) {
    try {
        const applications = await fetchPendingAndShortlistedApplications(user);
        const startIndex = (currentPage - 1) * APPLICATIONS_PER_PAGE;
        const paginatedApplications = applications.slice(startIndex, startIndex + APPLICATIONS_PER_PAGE);
        
        updateApplicationsTable(paginatedApplications);
        updatePaginationButtons();
    } catch (error) {
        console.error("Error fetching next applications:", error);
    }
}

async function fetchPreviousApplications(user) {
    try {
        const applications = await fetchPendingAndShortlistedApplications(user);
        const startIndex = (currentPage - 1) * APPLICATIONS_PER_PAGE;
        const paginatedApplications = applications.slice(startIndex, startIndex + APPLICATIONS_PER_PAGE);
        
        updateApplicationsTable(paginatedApplications);
        updatePaginationButtons();
    } catch (error) {
        console.error("Error fetching previous applications:", error);
    }
}




const JOB_STATUS_COLORS = {
    'activeJobs': { 
        icon: '#27ae60',     // Green for active jobs
        background: '#e8f5e9' 
    },
    'hiddenJobs': { 
        icon: '#95a5a6',     // Gray for hidden jobs
        background: '#f2f4f4' 
    }
};


// Add this function to fetch job status counts
async function fetchJobStatusCounts(user) {
    try {
        if (!user || !user.uid) {
            throw new Error("Invalid user authentication");
        }

        // Fetch employer's job IDs
        const employerRef = doc(db, 'employers', user.uid);
        const employerSnap = await getDoc(employerRef);

        if (!employerSnap.exists()) {
            throw new Error('Employer profile not found');
        }

        const jobIds = employerSnap.data().jobIds || [];

        // Prepare to count job statuses
        const jobStatusCounts = {
            activeJobs: 0,
            hiddenJobs: 0
        };

        // Fetch status for each job
        for (const jobId of jobIds) {
            const jobRef = doc(db, 'jobs', jobId);
            const jobSnap = await getDoc(jobRef);

            if (jobSnap.exists()) {
                const jobStatus = jobSnap.data().status;
                
                if (jobStatus === 'active') {
                    jobStatusCounts.activeJobs++;
                } else if (jobStatus === 'hide') {
                    jobStatusCounts.hiddenJobs++;
                }
            }
        }

        // Update the job status UI
        updateJobStatusUI(jobStatusCounts);
    } catch (error) {
        console.error("Error fetching job status counts:", error);
    }
}

function updateJobStatusUI(jobStatusCounts) {
    const jobsContainer = document.querySelector('.jobs-container.full-width');
    jobsContainer.innerHTML = ''; // Clear existing content

    const jobStatusOrder = ['activeJobs', 'hiddenJobs'];

    jobStatusOrder.forEach(jobType => {
        const count = jobStatusCounts[jobType] || 0;
        const jobColors = JOB_STATUS_COLORS[jobType];

        const jobItem = document.createElement('div');
        jobItem.classList.add('status-item');
        jobItem.style.backgroundColor = jobColors.background;

        const jobIcon = document.createElement('div');
        jobIcon.classList.add('status-icon');
        jobIcon.innerHTML = getJobStatusIcon(jobType);
        jobIcon.style.color = jobColors.icon;

        const jobText = document.createElement('div');
        jobText.classList.add('status-text');
        jobText.textContent = jobType === 'activeJobs' ? 'Active Jobs' : 'Hide Jobs';

        const jobCount = document.createElement('div');
        jobCount.classList.add('status-count');
        jobCount.textContent = count;
        jobCount.style.color = jobColors.icon;

        jobItem.appendChild(jobIcon);
        jobItem.appendChild(jobText);
        jobItem.appendChild(jobCount);

        jobsContainer.appendChild(jobItem);
    });
}

function getJobStatusIcon(jobType) {
    switch (jobType) {
        case 'activeJobs':
            return '<i class="fas fa-briefcase"></i>';
        case 'hiddenJobs':
            return '<i class="fas fa-users"></i>';
        default:
            return '';
    }
}

async function fetchJobApplicantDataFromFirebase(user) {
    try {
        if (!user || !user.uid) {
            throw new Error("Invalid user authentication");
        }

        // Fetch employer's job IDs
        const employerRef = doc(db, 'employers', user.uid);
        const employerSnap = await getDoc(employerRef);

        if (!employerSnap.exists()) {
            throw new Error('Employer profile not found');
        }

        const jobIds = employerSnap.data().jobIds || [];

        // Prepare to store job applicant data
        const jobApplicantsData = [];

        // Fetch applicant count for each job
        for (const jobId of jobIds) {
            const jobRef = doc(db, 'jobs', jobId);
            const jobSnap = await getDoc(jobRef);

            if (jobSnap.exists()) {
                const jobTitle = jobSnap.data().title;
                const applicationIds = jobSnap.data().applicationIds || [];

                jobApplicantsData.push({
                    jobTitle: jobTitle,
                    applicantCount: applicationIds.length
                });
            }
        }

        // Sort jobs by applicant count in descending order
        jobApplicantsData.sort((a, b) => b.applicantCount - a.applicantCount);

        return jobApplicantsData;
    } catch (error) {
        console.error("Error fetching job applicant data:", error);
        throw error;
    }
}

function createJobApplicantsBarChart(jobApplicantsData) {
    // Total number of jobs
    const totalJobs = jobApplicantsData.length;
    
    // Limit to top 10 jobs by applicant count
    const topJobs = jobApplicantsData
        .sort((a, b) => b.applicantCount - a.applicantCount)
        .slice(0, 10);

    const labels = topJobs.map(job => {
        const maxLength = 20;
        return job.jobTitle.length > maxLength 
            ? job.jobTitle.substring(0, maxLength) + '...' 
            : job.jobTitle;
    });
    const applicantCounts = topJobs.map(job => Math.round(job.applicantCount));
  
    const ctx = document.getElementById('jobApplicantsBarChart').getContext('2d');
    
    // Create a container for additional information
    const chartContainer = document.getElementById('jobApplicantsBarChart').closest('.job-applicants-chart-container');
    
    // Add a note about total jobs if more than 10
    if (totalJobs > 10) {
        const noteElement = document.createElement('div');
        noteElement.style.fontSize = '0.8rem';
        noteElement.style.color = '#6c757d';
        noteElement.style.marginTop = '10px';
        noteElement.style.textAlign = 'center';
        noteElement.textContent = `Showing top 10 out of ${totalJobs} jobs`;
        chartContainer.appendChild(noteElement);
    }

    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Number of Applicants',
          data: applicantCounts,
          backgroundColor: '#3498db',
          borderColor: '#2980b9',
          borderWidth: 1,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y',
        scales: {
          x: {
            beginAtZero: true,
            ticks: {
              precision: 0,  // No decimal places
              stepSize: 1    // Ensure whole number steps
            },
            title: {
              display: true,
              text: 'Number of Applicants',
            },
          },
        },
        plugins: {
          title: {
            display: true,
            text: 'Top Job Applicants Overview',
            font: { size: 16, weight: 'bold' },
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                const fullJobTitle = topJobs[context.dataIndex].jobTitle;
                return `${fullJobTitle}: ${context.formattedValue} applicants`;
              }
            }
          },
          legend: { display: false },
        },
      },
    });
}


let currentJobListingsPage = 1;
const JOB_LISTINGS_PER_PAGE = 4;
let totalJobListings = 0;

async function fetchJobListingsData(user) {
    try {
        if (!user || !user.uid) {
            throw new Error("Invalid user authentication");
        }

        const employerRef = doc(db, 'employers', user.uid);
        const employerSnap = await getDoc(employerRef);

        if (!employerSnap.exists()) {
            throw new Error('Employer profile not found');
        }

        const jobIds = employerSnap.data().jobIds || [];

        const jobListingsData = [];

        for (const jobId of jobIds) {
            const jobRef = doc(db, 'jobs', jobId);
            const jobSnap = await getDoc(jobRef);

            if (jobSnap.exists()) {
                const jobData = jobSnap.data();
                jobListingsData.push({
                    jobTitle: jobData.title || 'N/A',
                    postedDate: jobData.postedDate || null,
                    status: jobData.status || 'N/A',
                    applicantsCount: jobData.applicationIds ? jobData.applicationIds.length : 0
                });
            }
        }

        // Sort jobs by posted date, most recent first
        jobListingsData.sort((a, b) => {
            if (a.postedDate && b.postedDate) {
                return b.postedDate - a.postedDate;
            }
            return 0;
        });

        return jobListingsData;
    } catch (error) {
        console.error("Error fetching job listings data:", error);
        throw error;
    }
}

function updateJobListingsTable(jobListings) {
    const tableBody = document.getElementById('jobListingsTableBody');
    tableBody.innerHTML = '';

    if (!jobListings || jobListings.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center">No job listings found</td>
            </tr>
        `;
        return;
    }

    jobListings.forEach(job => {
        const row = document.createElement('tr');
        let jobStatus;
        if (job.status === 'active') {
            jobStatus = 'Active';
        }else if(job.status === 'hide'){
            jobStatus = 'Hidden';
        }else{
            jobStatus = job.status ? job.status.toUpperCase() : 'N/A';
        }
        row.innerHTML = `
            <td>${job.jobTitle || 'N/A'}</td>
            <td>${formatDate(job.postedDate)}</td>
            <td>${jobStatus || 'N/A'}</td>
            <td>${job.applicantsCount || 0}</td>
        `;
        tableBody.appendChild(row);
    });
}

function updateJobListingsPaginationButtons() {
    const prevBtn = document.getElementById('prevJobListingsBtn');
    const nextBtn = document.getElementById('nextJobListingsBtn');
    const pageInfo = document.getElementById('jobListingsPageInfo'); // Corrected ID

    prevBtn.disabled = currentJobListingsPage === 1;
    nextBtn.disabled = currentJobListingsPage * JOB_LISTINGS_PER_PAGE >= totalJobListings;

    pageInfo.textContent = `Page ${currentJobListingsPage} of ${Math.ceil(totalJobListings / JOB_LISTINGS_PER_PAGE)}`;
}

async function fetchNextJobListings(user) {
    try {
        const jobListings = await fetchJobListingsData(user);
        const startIndex = (currentJobListingsPage - 1) * JOB_LISTINGS_PER_PAGE;
        const paginatedJobListings = jobListings.slice(startIndex, startIndex + JOB_LISTINGS_PER_PAGE);
        
        updateJobListingsTable(paginatedJobListings);
        updateJobListingsPaginationButtons();
    } catch (error) {
        console.error("Error fetching next job listings:", error);
    }
}

async function fetchPreviousJobListings(user) {
    try {
        const jobListings = await fetchJobListingsData(user);
        const startIndex = (currentJobListingsPage - 1) * JOB_LISTINGS_PER_PAGE;
        const paginatedJobListings = jobListings.slice(startIndex, startIndex + JOB_LISTINGS_PER_PAGE);
        
        updateJobListingsTable(paginatedJobListings);
        updateJobListingsPaginationButtons();
    } catch (error) {
        console.error("Error fetching previous job listings:", error);
    }
}


// Add event listener for the Manage Jobs button
document.getElementById('manageJobsBtn').addEventListener('click', () => {
    window.location.href = '/managejob.html';  // Adjust the URL to your job management page
});