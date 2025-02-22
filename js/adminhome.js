import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-app.js";
import { getFirestore, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js";

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


function selectProgram(program) {
    sessionStorage.setItem('selectedProgram', program); // Store program in session storage
    console.log("Selected Program: " + program); // Corrected the variable name to 'program'
    window.location.href = 'studentpage.html'; // Navigate to the student page
}
window.selectProgram = selectProgram;

// Faculty Program Mapping
const FACULTY_PROGRAMS = {
    'FBM': [
        'Diploma in Culinary Arts', 'Diploma in Hotel Management', 'Bachelor of Hospitality Management (Honours)',
        'Bachelor of Culinary Arts (Honours)', 'Bachelor of Finance (Hons)', 'Bachelor of Accountancy (Honours)',
        'Diploma in Business Management', 'Bachelor of Business Administration (Honours)'
    ],
    'FCE': [
        'Diploma in Mechatronics Engineering', 'Bachelor of Mechatronics Engineering with Honours',
        'Bachelor of Electronics Technology with Honours', 'Diploma in Information Technology',
        'Bachelor of Science (Honours) Actuarial Sciences', 'Bachelor of Information Technology (Hons)',
        'Bachelor of Computer Science (Hons)'
    ],
    'FILS': [
        'Diploma in Environmental Technology', 'Bachelor of Environmental Technology (Honours)',
        'Bachelor of Science in Biotechnology (Honours)', 'Bachelor in Food Science with Management (Honours)'
    ],
    'FSS': [
        'Bachelor of Arts (Honours)Teaching of English as a Second Language', 'Diploma in Early Childhood Education',
        'Bachelor in Early Childhood Education (Honours)', 'Bachelor of Special Needs Education (Honours)',
        'Bachelor of Mass Communication (Honours) Advertising', 'Bachelor of Mass Communication (Honours) Journalism',
        'Bachelor of Corporate Communication (Honours)', 'Bachelor of Psychology (Honours)'
    ],
    'FOP': ['Faculty of Pharmacy'],
    'FOM': ['Faculty of Medicine']
};

async function fetchFacultyStudentData() {
    const facultyData = {};

    try {
        // Fetch total registered students
        const allStudentsSnapshot = await getDocs(collection(db, 'allStudents'));
        const totalRegisteredStudents = allStudentsSnapshot.docs.length;

        console.log('Total Registered Students:', totalRegisteredStudents); // Debugging
        facultyData.totalRegisteredStudents = totalRegisteredStudents; // Assign to top-level

        // Process data for each faculty
        for (const [faculty, programs] of Object.entries(FACULTY_PROGRAMS)) {
            facultyData[faculty] = {
                totalStudents: 0,
                hiredStudents: 0,
            };
        }

        // Fetch data for each program
        for (const [faculty, programs] of Object.entries(FACULTY_PROGRAMS)) {
            for (const program of programs) {
                // Query students in the sub-collection `students` under each program
                const programCollectionRef = collection(db, 'students', program, 'students');
                const programSnapshot = await getDocs(programCollectionRef);

                let programTotalStudents = 0;
                let programHiredStudents = 0;

                programSnapshot.forEach((doc) => {
                    const studentData = doc.data();
                    programTotalStudents++;
                    if (studentData.internshipStatus === "Hired") {
                        programHiredStudents++;
                    }
                });

                // Add program totals to faculty totals
                facultyData[faculty].totalStudents += programTotalStudents;
                facultyData[faculty].hiredStudents += programHiredStudents;
            }
        }
        
        console.log('Faculty Data:', facultyData); // Debugging
        return facultyData;
    } catch (error) {
        console.error('Error fetching faculty student data:', error);
        return null;
    }
}


function updateStatusContainer(facultyData) {
    const statusContainer = document.querySelector('.status-container');
    statusContainer.innerHTML = ''; // Clear existing content

    // Total registered students component
    const totalRegisteredItem = document.createElement('div');
    totalRegisteredItem.classList.add('status-item');
    totalRegisteredItem.style.backgroundColor = '#2c3e50';
    totalRegisteredItem.innerHTML = `
        <div class="status-icon" style="color: #ecf0f1;">
            <i class="fas fa-users"></i>
        </div>
        <div class="status-text" style="color: white !important;">Total Registered Students</div>
        <div class="status-count" style="color: #ecf0f1;">${facultyData.totalRegisteredStudents}</div>
    `;
    statusContainer.appendChild(totalRegisteredItem);

    // Faculty-specific status items
    const facultyOrder = ['FBM', 'FCE', 'FILS', 'FSS', 'FOP', 'FOM'];
    facultyOrder.forEach((faculty) => {
        const data = facultyData[faculty];
        const statusColors = STATUS_COLORS[faculty];

        const statusItem = document.createElement('div');
        statusItem.classList.add('status-item');
        statusItem.style.backgroundColor = statusColors.background;

        statusItem.innerHTML = `
            <div class="status-icon" style="color: ${statusColors.icon};">
                <i class="fas fa-graduation-cap"></i>
            </div>
            <div class="status-text">${faculty}</div>
            <div class="status-count" style="color: ${statusColors.icon};">
                ${data.hiredStudents} / ${data.totalStudents}
            </div>
        `;

        statusContainer.appendChild(statusItem);
    });
}

// Trigger fetching and rendering on authentication state change
onAuthStateChanged(auth, async (user) => {
    if (user) {
        try {
            const facultyData = await fetchFacultyStudentData();
            const totalEmployers = await fetchTotalEmployers(); // Use 'const' or 'let'
            
            if (facultyData) {
                updateStatusContainer(facultyData);
                updateStudentsTable(facultyData);
                createFacultyHiringPieChart();
                updateEmployerStatusContainer(totalEmployers);

                const topEmployersData = await fetchTopEmployersData();
                createTopEmployersBarChart(topEmployersData);

                const employersData = await fetchEmployersData();
                // Remove or modify this line to avoid reassignment
                // totalEmployers = employersData.length;
                
                // Update table with first page of results
                updateEmployersTable(employersData);
                updateEmployersPaginationButtons();
    
                // Add event listeners for pagination
                document.getElementById('prevEmployersBtn').addEventListener('click', fetchPreviousEmployers);
                document.getElementById('nextEmployersBtn').addEventListener('click', fetchNextEmployers);
            } else {
                console.error("No faculty data returned");
            }
        } catch (error) {
            console.error("Complete error details:", error);
        }
    } else {
        console.error("No authenticated user");
    }
});

// Also modify the DOM content loaded listener
document.addEventListener('DOMContentLoaded', async () => {
    const facultyData = await fetchFacultyStudentData();
    updateStatusContainer(facultyData);
    updateStudentsTable(facultyData);  // Add this line
});

// Status colors (ensure this is defined)
const STATUS_COLORS = {
    'FBM': { icon: '#27ae60', background: '#e8f5e9' },
    'FCE': { icon: '#3498db', background: '#e3f2fd' },
    'FILS': { icon: '#f39c12', background: '#fff3e0' },
    'FSS': { icon: '#9b59b6', background: '#f4ecf7' },
    'FOP': { icon: '#e74c3c', background: '#fdedec' },
    'FOM': { icon: '#34495e', background: '#f2f3f4' }
};

const FACULTY_COLORS = {
    'FBM': '#27ae60',   // Green
    'FCE': '#3498db',   // Blue
    'FILS': '#f39c12',  // Orange
    'FSS': '#9b59b6',   // Purple
    'FOP': '#e74c3c',   // Red
    'FOM': '#34495e'    // Dark Gray
};

async function createFacultyHiringPieChart() {
    const facultyHiringData = {};

    try {
        // Loop through each faculty and its programs
        for (const [faculty, programs] of Object.entries(FACULTY_PROGRAMS)) {
            facultyHiringData[faculty] = {
                totalStudents: 0,
                hiredStudents: 0
            };

            // Process each program in the faculty
            for (const program of programs) {
                const programCollectionRef = collection(db, 'students', program, 'students');
                const programSnapshot = await getDocs(programCollectionRef);

                programSnapshot.forEach((doc) => {
                    const studentData = doc.data();
                    facultyHiringData[faculty].totalStudents++;
                    if (studentData.internshipStatus === "Hired") {
                        facultyHiringData[faculty].hiredStudents++;
                    }
                });
            }
        }

        // Prepare data for pie chart
        const facultyLabels = Object.keys(facultyHiringData);
        const hiredStudentCounts = facultyLabels.map(faculty => 
            facultyHiringData[faculty].hiredStudents
        );
        const backgroundColors = facultyLabels.map(faculty => FACULTY_COLORS[faculty]);

        // Create pie chart
        const ctx = document.getElementById('facultyHiringPieChart').getContext('2d');
        
        new Chart(ctx, {
            type: 'pie',
            data: {
                labels: facultyLabels,
                datasets: [{
                    data: hiredStudentCounts,
                    backgroundColor: backgroundColors
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                layout: {
                    padding: {
                        top: 10,
                        bottom: 10,
                        left: 20,
                        right: 20
                    }
                },
                plugins: {
                    title: {
                        display: true,
                        text: 'Number of Hired Students by Faculty',
                        font: { size: 14, weight: 'bold' }
                    },
                    legend: {
                        position: 'right',
                        labels: { 
                            font: { size: 10 },
                            generateLabels: (chart) => {
                                const data = chart.data;
                                return data.labels.map((label, index) => ({
                                    text: `${label}: ${data.datasets[0].data[index]}`,
                                    fillStyle: data.datasets[0].backgroundColor[index]
                                }));
                            }
                        }
                    }
                }
            }
        });

    } catch (error) {
        console.error('Error creating faculty hiring pie chart:', error);
    }
}


function updateStudentsTable(facultyData) {
    const tableBody = document.getElementById('studentsTableBody');
    tableBody.innerHTML = ''; // Clear existing content

    const facultyOrder = ['FBM', 'FCE', 'FILS', 'FSS', 'FOP', 'FOM'];

    facultyOrder.forEach((faculty) => {
        const data = facultyData[faculty];
        const pendingStudents = data.totalStudents - data.hiredStudents;

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${faculty}</td>
            <td>${data.totalStudents}</td>
            <td>${data.hiredStudents}</td>
            <td>${pendingStudents}</td>
        `;
        tableBody.appendChild(row);
    });
}


// Add this function to fetch total number of employers
async function fetchTotalEmployers() {
    try {
        const employersCollectionRef = collection(db, 'employers');
        const employersSnapshot = await getDocs(employersCollectionRef);
        return employersSnapshot.docs.length;
    } catch (error) {
        console.error('Error fetching total employers:', error);
        return 0;
    }
}

// Update the employer status container
function updateEmployerStatusContainer(totalEmployers) {
    const employerStatusContainer = document.querySelector('.employer-status-container');
    employerStatusContainer.innerHTML = ''; // Clear existing content

    const employerStatusItem = document.createElement('div');
    employerStatusItem.classList.add('status-item');
    employerStatusItem.style.backgroundColor = '#2980b9';
    employerStatusItem.innerHTML = `
        <div class="status-icon" style="color: #ecf0f1;">
            <i class="fas fa-building"></i>
        </div>
        <div class="status-text" style="color: white !important;">Total Number of Employers</div>
        <div class="status-count" style="color: #ecf0f1;">${totalEmployers}</div>
    `;
    employerStatusContainer.appendChild(employerStatusItem);
}

async function fetchTopEmployersData() {
    try {
        const employersRef = collection(db, 'employers');
        const employersSnapshot = await getDocs(employersRef);

        const employersData = [];

        employersSnapshot.forEach((doc) => {
            const employerData = doc.data();
            if (employerData.hiredNumber && employerData.hiredNumber > 0) {
                employersData.push({
                    name: employerData.company_name || employerData.companyName || 'Unknown Employer',
                    hiredNumber: employerData.hiredNumber
                });
            }
        });

        // Sort employers by hired number in descending order and take top 10
        return employersData
            .sort((a, b) => b.hiredNumber - a.hiredNumber)
            .slice(0, 10);
    } catch (error) {
        console.error("Error fetching top employers data:", error);
        return [];
    }
}

function createTopEmployersBarChart(topEmployersData) {
    const ctx = document.getElementById('topEmployersBarChart').getContext('2d');
    
    const labels = topEmployersData.map(employer => {
        const maxLength = 20;
        return employer.name.length > maxLength 
            ? employer.name.substring(0, maxLength) + '...' 
            : employer.name;
    });
    const hiredNumbers = topEmployersData.map(employer => employer.hiredNumber);
    const totalEmployers = topEmployersData.length;
  
    // Create a container for additional information
    const chartContainer = document.getElementById('topEmployersBarChart').closest('.top-employers-chart-container');
    
    // Add a note about total employers if more than 10
    if (totalEmployers > 10) {
        const noteElement = document.createElement('div');
        noteElement.style.fontSize = '0.8rem';
        noteElement.style.color = '#6c757d';
        noteElement.style.marginTop = '10px';
        noteElement.style.textAlign = 'center';
        noteElement.textContent = `Showing top 10 out of ${totalEmployers} employers`;
        chartContainer.appendChild(noteElement);
    }

    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Hired Students',
          data: hiredNumbers,
          backgroundColor: '#3498db',
          borderColor: '#2980b9',
          borderWidth: 1,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: {
          padding: {
            top: 10,
            bottom: 10,
            left: 10,
            right: 10
          }
        },
        indexAxis: 'y',
        scales: {
          x: {
            beginAtZero: true,
            ticks: {
              precision: 0,
              stepSize: 1,
              font: {
                size: 10
              }
            },
            title: {
              display: true,
              text: 'Hired Students',
              font: {
                size: 10
              }
            },
          },
          y: {
            ticks: {
              font: {
                size: 10
              }
            }
          }
        },
        plugins: {
          title: {
            display: true,
            text: 'Top Employers',
            font: { size: 12, weight: 'bold' },
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                const fullEmployerName = topEmployersData[context.dataIndex].name;
                return `${fullEmployerName}: ${context.formattedValue} hired students`;
              }
            }
          },
          legend: { display: false },
        },
      },
    });
}

let currentEmployersPage = 1;
const EMPLOYERS_PER_PAGE = 5;
let totalEmployers = 0;

async function fetchEmployersData() {
    try {
        const employersRef = collection(db, 'employers');
        const employersSnapshot = await getDocs(employersRef);
        const employersData = [];

        employersSnapshot.forEach((doc) => {
            const employerData = doc.data();
            employersData.push({
                company_name: employerData.company_name || employerData.companyName || 'Unknown Employer',
                jobsCount: employerData.jobIds ? employerData.jobIds.length : 0,
                hiredNumber: employerData.hiredNumber || 0,
                status: employerData.status || 'Not Specified'
            });
        });

        // Sort employers by hired number in descending order
        return employersData.sort((a, b) => b.hiredNumber - a.hiredNumber);
    } catch (error) {
        console.error("Error fetching employers data:", error);
        return [];
    }
}
function updateEmployersTable(employersData) {
    const tableBody = document.getElementById('employersTableBody');
    tableBody.innerHTML = ''; // Clear existing content

    const startIndex = (currentEmployersPage - 1) * EMPLOYERS_PER_PAGE;
    const endIndex = startIndex + EMPLOYERS_PER_PAGE;
    const paginatedEmployers = employersData.slice(startIndex, endIndex);

    paginatedEmployers.forEach((employer) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${employer.company_name}</td>
            <td>${employer.jobsCount}</td>
            <td>${employer.hiredNumber}</td>
            <td>${employer.status}</td>
        `;
        tableBody.appendChild(row);
    });
}

async function updateEmployersPaginationButtons() {
    try {
        const employersData = await fetchEmployersData();
        totalEmployers = employersData.length;

        const prevBtn = document.getElementById('prevEmployersBtn');
        const nextBtn = document.getElementById('nextEmployersBtn');
        const pageInfo = document.getElementById('employersPageInfo');

        prevBtn.disabled = currentEmployersPage === 1;
        nextBtn.disabled = currentEmployersPage * EMPLOYERS_PER_PAGE >= totalEmployers;

        pageInfo.textContent = `Page ${currentEmployersPage} of ${Math.ceil(totalEmployers / EMPLOYERS_PER_PAGE)}`;
    } catch (error) {
        console.error("Error updating employers pagination buttons:", error);
    }
}

async function fetchNextEmployers() {
    try {
        const employersData = await fetchEmployersData();
        totalEmployers = employersData.length;
        
        if (currentEmployersPage * EMPLOYERS_PER_PAGE < totalEmployers) {
            currentEmployersPage++;
            updateEmployersTable(employersData);
            updateEmployersPaginationButtons();
        }
    } catch (error) {
        console.error("Error fetching next employers:", error);
    }
}

async function fetchPreviousEmployers() {
    try {
        const employersData = await fetchEmployersData();
        
        if (currentEmployersPage > 1) {
            currentEmployersPage--;
            updateEmployersTable(employersData);
            updateEmployersPaginationButtons();
        }
    } catch (error) {
        console.error("Error fetching previous employers:", error);
    }
}



document.getElementById('manageEmpBtn').addEventListener('click', () => {
    window.location.href = '/manage-employer.html';  // Adjust the URL to your job management page
});