// main.js
import { loadSidebar } from '../js/sidebaradmin.js';
import { loadHeader } from '../js/header.js';


// Ensure loadHeader is called after the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    // Load the sidebar and header components
    loadSidebar();
    loadHeader();
});