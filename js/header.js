export function loadHeader() {
    return fetch('header.html') // Return a Promise
        .then(response => {
            if (!response.ok) {
                throw new Error(`Error loading header: ${response.statusText}`);
            }
            return response.text();
        })
        .then(html => {
            document.getElementById('header-container').innerHTML = html;
        })
        .catch(error => {
            console.error('Error loading header:', error);
            document.getElementById('header-container').innerHTML = `<p>Error loading header. Please try again later.</p>`;
        });
}