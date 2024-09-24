// Import the initializeSignOut function from signout.js
import { initializeSignOut } from './signout.js';  // Adjust the path as needed


// sidebar.js
export function loadSidebar() {
    fetch('sidebar.html')
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
        })
        .catch(error => {
            console.error('Error loading sidebar:', error);
            document.getElementById('sidebar-container').innerHTML = `<p>Error loading sidebar. Please try again later.</p>`;
        });
}
