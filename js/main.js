import { loadSidebar } from '../js/sidebar.js';
import { loadHeader } from '../js/header.js';

// Ensure loadHeader and loadSidebar are called after the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    // Load the sidebar and header components, then attach the toggle function
    Promise.all([loadSidebar(), loadHeader()])
        .then(() => {
            attachMenuToggle(); // Only attach the toggle after both components are fully loaded
            attachCloseButton(); // Attach the close button functionality
        })
        .catch(error => {
            console.error('Error loading components:', error);
        });
});

function attachMenuToggle() {
    const menuToggle = document.getElementById('menu-toggle');
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.getElementById('main-content');

    if (menuToggle) {
        menuToggle.addEventListener('click', () => {
            // Toggle the visibility of the sidebar
            sidebar.classList.toggle('visible');
            mainContent.classList.toggle('sidebar-visible');
        });
    } else {
        console.error('Menu toggle button not found.');
    }
}

function attachCloseButton() {
    const sidebar = document.getElementById('sidebar');
    
    const closeButton = document.getElementById('close-sidebar');
    const mainContent = document.getElementById('main-content');

    if (closeButton) {
        closeButton.addEventListener('click', () => {
            // Hide the sidebar when the close button is clicked
            sidebar.classList.remove('visible');
            mainContent.classList.remove('sidebar-visible');
        });
    } else {
        console.error('Close button not found.');
    }
}
