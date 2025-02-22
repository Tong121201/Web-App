import { loadSidebar } from '../js/sidebaradmin.js';
import { loadHeader } from '../js/header.js';

document.addEventListener('DOMContentLoaded', () => {
    // Ensure both components are loaded before proceeding
    Promise.all([loadSidebar(), loadHeader()])
        .then(() => {
            attachMenuToggle();
            attachCloseButton();
        })
        .catch(error => {
            console.error('Error loading sidebar or header components:', error);
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
