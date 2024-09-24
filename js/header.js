// header.js
export function loadHeader() {
    fetch('header.html')
        .then(response => {
            if (!response.ok) {
                throw new Error(`Error loading header: ${response.statusText}`);
            }
            return response.text();
        })
        .then(html => {
            document.getElementById('header-container').innerHTML = html;
            attachMenuToggle(); // Attach event listeners after loading
        })
        .catch(error => {
            console.error('Error loading header:', error);
            document.getElementById('header-container').innerHTML = `<p>Error loading header. Please try again later.</p>`;
        });
}

function attachMenuToggle() {
    const menuToggle = document.getElementById('menu-toggle');
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.getElementById('main-content');

    if (menuToggle) {
        menuToggle.addEventListener('click', () => {
            sidebar.classList.toggle('visible');
            mainContent.classList.toggle('sidebar-visible');
        });
    }
}
