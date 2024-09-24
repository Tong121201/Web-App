// notification.js
export function loadNotification() {
    fetch('notification.html')
        .then(response => {
            if (!response.ok) {
                throw new Error(`Error loading notification: ${response.statusText}`);
            }
            return response.text();
        })
        .then(html => {
            document.getElementById('notification-container').innerHTML = html;
            attachNotificationEvents(); // Attach event listeners after loading
        })
        .catch(error => {
            console.error('Error loading notification:', error);
            document.getElementById('notification-container').innerHTML = `<p>Error loading notifications. Please try again later.</p>`;
        });
}

function attachNotificationEvents() {
    const bell = document.getElementById('notificationBell');
    const panel = document.getElementById('notificationPanel');
    const list = document.getElementById('notificationList');
    const count = document.getElementById('notificationCount');
    const deleteBtn = document.getElementById('deleteBtn');

    const notifications = [
        { id: 1, title: 'New Message', content: 'You have a new message', time: new Date(2024, 8, 13, 10, 30), unread: true, link: '#message1' },
        { id: 2, title: 'Reminder', content: 'Meeting in 30 minutes', time: new Date(2024, 8, 13, 11, 0), unread: true, link: '#reminder1' },
        { id: 3, title: 'Update', content: 'System update completed', time: new Date(2024, 8, 13, 11, 30), unread: true, link: '#update1' }
    ];

    function updateNotificationCount() {
        const unreadCount = notifications.filter(note => note.unread).length;
        count.textContent = unreadCount;
        count.style.display = unreadCount > 0 ? 'inline-block' : 'none';
    }

    function renderNotifications() {
        if (notifications.length === 0) {
            list.innerHTML = '<div class="no-notifications">No Notifications Yet</div>';
            deleteBtn.disabled = true;
        } else {
            list.innerHTML = notifications.map(note => `
                <div class="notification-item ${note.unread ? 'unread' : ''}" data-id="${note.id}" data-link="${note.link}">
                    <input type="checkbox" class="notification-checkbox">
                    <div class="notification-content">
                        <div class="notification-title">${note.title}</div>
                        <div class="notification-message">${note.content}</div>
                        <div class="notification-time">${note.time.toLocaleString()}</div>
                    </div>
                </div>
            `).join('');
        }
        updateNotificationCount();
    }

    function addNewNotification(title, content, link) {
        const newId = notifications.length > 0 ? Math.max(...notifications.map(n => n.id)) + 1 : 1;
        const newNotification = {
            id: newId,
            title: title,
            content: content,
            time: new Date(),
            unread: true,
            link: link
        };
        notifications.unshift(newNotification);
        renderNotifications();
    }

    bell.addEventListener('click', () => {
        panel.style.display = panel.style.display === 'block' ? 'none' : 'block';
        renderNotifications();
    });

    list.addEventListener('click', (e) => {
        const item = e.target.closest('.notification-item');
        if (item && !e.target.classList.contains('notification-checkbox')) {
            const id = parseInt(item.dataset.id);
            const notification = notifications.find(note => note.id === id);
            if (notification) {
                if (notification.unread) {
                    notification.unread = false;
                    item.classList.remove('unread');
                    updateNotificationCount();
                }
                window.location.href = notification.link;
            }
        }
    });

    list.addEventListener('change', (e) => {
        if (e.target.classList.contains('notification-checkbox')) {
            const checkedBoxes = list.querySelectorAll('.notification-checkbox:checked');
            deleteBtn.disabled = checkedBoxes.length === 0;
        }
    });

    deleteBtn.addEventListener('click', () => {
        const checkedBoxes = list.querySelectorAll('.notification-checkbox:checked');
        const idsToRemove = Array.from(checkedBoxes).map(cb => parseInt(cb.closest('.notification-item').dataset.id));
        notifications = notifications.filter(note => !idsToRemove.includes(note.id));
        renderNotifications();
    });

    // Simulate receiving new notifications
    setTimeout(() => {
        addNewNotification('New Alert', 'You have a new alert', '#newAlert1');
    }, 5000);
}
