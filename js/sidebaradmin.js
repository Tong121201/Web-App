// Import the initializeSignOut function from signout.js
import { initializeSignOut } from './signout.js';  // Adjust the path as needed

export function loadSidebar() {
    fetch('sidebar-admin.html')
        .then(response => {
            if (!response.ok) {
                throw new Error(`Error loading sidebar: ${response.statusText}`);
            }
            return response.text();
        })
        .then(html => {
            document.getElementById('sidebar-container').innerHTML = html;

            // Call the function to initialize the sign-out functionality
            initializeSignOut();

            // Now, add the event listener
            const studentsItem = document.querySelector('.sidebar-item:nth-child(2)'); // Select the "Students" item
            const subItems = document.querySelector('ul'); // Select the <ul> with subitems

            if (studentsItem && subItems) { // Check if elements exist
                studentsItem.addEventListener('click', function() {
                    const isVisible = subItems.style.display === 'block';
                    subItems.style.display = isVisible ? 'none' : 'block'; // Toggle visibility
                });
            }
        })
        .catch(error => {
            console.error('Error loading sidebar:', error);
            document.getElementById('sidebar-container').innerHTML = `<p>Error loading sidebar. Please try again later.</p>`;
        });
}
