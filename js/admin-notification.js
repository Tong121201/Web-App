const firebaseConfig = {
    apiKey: "AIzaSyDOtb-QtwEqIaWPYOjvGsS4HGycXhZ8eZw",
    authDomain: "myproject-9638b.firebaseapp.com",
    projectId: "myproject-9638b",
    storageBucket: "myproject-9638b.appspot.com",
    messagingSenderId: "419251176337",
    appId: "1:419251176337:web:2e33df046378ef6c651030"
};

// Initialize Firebase immediately
if (!firebase.apps?.length) {
    firebase.initializeApp(firebaseConfig);
}

class AdminNotificationSystem {
    constructor() {
        this.notifications = [];
        this.unreadCount = 0;
        this.initialized = false;
        this.messaging = null;
        this.domInitialized = false;
        this.db = null;
        this.currentAdminId = null;
        this.notificationClickHandlers = new Set();
    }

    async initialize() {
        if (this.initialized) return;
    
        try {
            this.messaging = firebase.messaging();
            this.db = firebase.firestore();
            
            this.setupAuthStateListener();
            await this.waitForDOM();
            this.setupEventListeners();
            
            this.initialized = true;
            console.log('✅ Admin notification system initialized');
        } catch (error) {
            console.error('❌ Error initializing admin notification system:', error);
        }
    }

    setupAuthStateListener() {
        firebase.auth().onAuthStateChanged(async (user) => {
            if (user) {
                console.log('Admin signed in:', user.email);
                
                // Verify if the user is an admin
                const adminDoc = await this.db.collection('admins').doc(user.uid).get();
                if (adminDoc.exists) {
                    this.currentAdminId = user.uid;
                    await this.setupNotifications();
                    await this.loadNotificationsFromFirestore();
                    this.setupMessageHandlers();
                    this.setupFirestoreListener();
                } else {
                    console.error('User is not an admin');
                    this.currentAdminId = null;
                }
            } else {
                console.log('Admin signed out');
                this.currentAdminId = null;
                this.notifications = [];
                this.updateUnreadCount();
                this.renderNotifications();
            }
        });
    }

    async waitForDOM() {
        return new Promise((resolve) => {
            if (document.getElementById('notificationBell')) {
                this.domInitialized = true;
                resolve();
            } else {
                const observer = new MutationObserver((mutations, obs) => {
                    if (document.getElementById('notificationBell')) {
                        this.domInitialized = true;
                        obs.disconnect();
                        resolve();
                    }
                });

                observer.observe(document.body, {
                    childList: true,
                    subtree: true
                });
            }
        });
    }

    async setupNotifications() {
        try {
            if (!this.currentAdminId) return;
    
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
                const token = await this.messaging.getToken({
                    vapidKey: 'BDfeRGFP6NM8-H8j3zlBCxgUdaYXGYZJ11bZ_z00tZN8DZEwFIl9-nP7eJo6khVDPqISEZuBin72IqhWMzL_Dv4'
                });
                
                await this.db.collection('admins').doc(this.currentAdminId).update({
                    fcmToken: token,
                    lastTokenUpdate: firebase.firestore.FieldValue.serverTimestamp()
                });
                
                console.log('📱 Admin FCM Token updated:', token);
            }
        } catch (error) {
            console.error('❌ Error setting up admin notifications:', error);
        }
    }

    getNotificationContent(notification) {
        switch (notification.type) {
            case 'new_employer_registration':
                return {
                    title: notification.title || 'New Employer Registration',
                    body: `${notification.companyName || 'Unknown Company'} has registered as a new employer`
                };
            case 'new_application':
                return {
                    title: `New Application: ${notification.jobTitle || 'Unknown'}`,
                    body: `${notification.studentName || 'Unknown'} has applied to ${notification.jobTitle || 'Unknown'} at ${notification.companyName || 'Unknown'}`
                };
            default:
                return {
                    title: notification.title || 'Notification',
                    body: notification.body || 'No content'
                };
        }
    }

    formatDateTime(timestamp) {
        if (!timestamp) return 'Invalid Date';
        
        let date;
        if (typeof timestamp === 'string') {
            // Handle ISO string format (e.g., "2025-02-12T06:43:48.602Z")
            date = new Date(timestamp);
        } else if (timestamp?.seconds) {
            // Handle Firestore Timestamp object
            date = new Date(timestamp.seconds * 1000 + (timestamp.nanoseconds || 0) / 1000000);
        } else if (timestamp?.toDate) {
            // Handle Firestore Timestamp methods
            date = timestamp.toDate();
        } else {
            // Handle Date object
            date = new Date(timestamp);
        }

        // Check if the date is valid
        if (isNaN(date.getTime())) return 'Invalid Date';

        // Format to local date and time
        return date.toLocaleString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    }

    getTimestamp(notification) {
        const timestamp = notification.createdAt;
        if (!timestamp) return 0;

        try {
            if (typeof timestamp === 'string') {
                return new Date(timestamp).getTime();
            } else if (timestamp?.seconds) {
                return timestamp.seconds * 1000 + (timestamp.nanoseconds || 0) / 1000000;
            } else if (timestamp?.toDate) {
                return timestamp.toDate().getTime();
            }
            return new Date(timestamp).getTime();
        } catch (error) {
            console.error('Error parsing timestamp:', error);
            return 0;
        }
    }

    sortNotifications(notifications) {
        // Sort purely by timestamp, newest first
        return [...notifications].sort((a, b) => {
            const timeA = this.getTimestamp(a);
            const timeB = this.getTimestamp(b);
            return timeB - timeA;
        });
    }

    async loadNotificationsFromFirestore() {
        try {
            if (!this.currentAdminId) {
                console.log('❌ No admin user found');
                return;
            }
    
            const adminDoc = await this.db
                .collection('admins')
                .doc(this.currentAdminId)
                .get();
    
            if (adminDoc.exists && adminDoc.data().notifications) {
                const notifications = adminDoc.data().notifications;
                // Sort by timestamp only
                this.notifications = this.sortNotifications(notifications.map(notification => ({
                    ...notification,
                    timestamp: this.formatDateTime(notification.createdAt)
                })));
            }
    
            console.log('📬 Processed admin notifications:', this.notifications);
            this.updateUnreadCount();
            this.renderNotifications();
        } catch (error) {
            console.error('❌ Error loading admin notifications:', error);
            const list = document.getElementById('notificationList');
            if (list) {
                list.innerHTML = '<div class="empty-message">Unable to load notifications. Please try again later.</div>';
            }
        }
    }

    setupFirestoreListener() {
        if (!this.currentAdminId) {
            console.warn("⚠️ No authenticated admin found.");
            return;
        }
    
        this.unsubscribe = this.db
            .collection('admins')
            .doc(this.currentAdminId)
            .onSnapshot(
                (doc) => {
                    if (doc.exists && doc.data().notifications) {
                        const notifications = doc.data().notifications;
                        // Sort by timestamp only
                        this.notifications = this.sortNotifications(notifications.map(notification => ({
                            ...notification,
                            timestamp: this.formatDateTime(notification.createdAt)
                        })));
                        
                        this.updateUnreadCount();
                        this.renderNotifications();
                    }
                },
                (error) => {
                    console.error('❌ Admin Firestore listener error:', error);
                }
            );
    }

    
    setupEventListeners() {
        this.notificationClickHandlers.forEach(handler => {
            document.removeEventListener('click', handler);
        });
        this.notificationClickHandlers.clear();

        const bell = document.getElementById('notificationBell');
        const container = document.getElementById('notificationContainer');
        
        const bellClickHandler = (e) => {
            e.stopPropagation();
            container.style.display = container.style.display === 'block' ? 'none' : 'block';
        };
        
        bell?.addEventListener('click', bellClickHandler);
        this.notificationClickHandlers.add(bellClickHandler);
    
        const outsideClickHandler = (e) => {
            if (!e.target.closest('.notification-bell')) {
                container.style.display = 'none';
            }
        };
        
        const clearAllBtn = document.getElementById('clearAllNotifications');
        if (clearAllBtn) {
            const clearAllHandler = () => this.clearAll();
            clearAllBtn.addEventListener('click', clearAllHandler);
            this.notificationClickHandlers.add(clearAllHandler);
        }
        
        document.addEventListener('click', outsideClickHandler);
        this.notificationClickHandlers.add(outsideClickHandler);
    }

    setupMessageHandlers() {
        if (this.messageHandlerSetup) return;
        
        this.messaging.onMessage((payload) => {
            console.log('📨 Received admin foreground message:', payload);
            
            if (Notification.permission === 'granted' && document.visibilityState !== 'visible') {
                const notificationOptions = {
                    body: payload.notification.body,
                    data: payload.data,
                    requireInteraction: true,
                    tag: payload.data?.id || Date.now().toString(),
                    vibrate: [200, 100, 200]
                };
                
                navigator.serviceWorker.ready.then(registration => {
                    registration.showNotification(
                        payload.notification.title,
                        notificationOptions
                    );
                });
            }
        });
        
        this.messageHandlerSetup = true;
    }

    async markAsRead(notificationId) {
        try {
            if (!this.currentAdminId) return;

            const adminRef = this.db.collection('admins').doc(this.currentAdminId);
            const adminDoc = await adminRef.get();
            
            if (adminDoc.exists) {
                const notifications = adminDoc.data().notifications || [];
                
                // Find the index of the notification to update
                const notificationIndex = notifications.findIndex(n => 
                    n.title === 'New Employer Registration' && !n.read
                );

                if (notificationIndex !== -1) {
                    // Create a new notifications array with the updated notification
                    const updatedNotifications = [...notifications];
                    updatedNotifications[notificationIndex] = {
                        ...updatedNotifications[notificationIndex],
                        read: true,
                        readAt: new Date().toISOString()
                    };

                    // Update Firestore
                    await adminRef.update({
                        notifications: updatedNotifications
                    });

                    // Update local state - maintain the same sorting
                    this.notifications = this.sortNotifications(updatedNotifications.map(notification => ({
                        ...notification,
                        timestamp: this.formatDateTime(notification.createdAt)
                    })));

                    // Update UI
                    this.updateUnreadCount();
                    this.renderNotifications();
                }
            }
        } catch (error) {
            console.error('❌ Error marking notification as read:', error);
        }
    }

    async clearAll() {
        try {
            if (!this.currentAdminId) {
                console.warn('No admin user found');
                return;
            }

            // Update the admin document to have an empty notifications array
            await this.db.collection('admins')
                .doc(this.currentAdminId)
                .update({
                    notifications: [] // Clear the notifications array
                });

            // Clear local notifications array
            this.notifications = [];
            
            // Update UI
            this.updateUnreadCount();
            this.renderNotifications();
            
            console.log('✅ Successfully cleared all admin notifications');
        } catch (error) {
            console.error('❌ Error clearing admin notifications:', error);
        }
    }

    updateUnreadCount() {
        const badge = document.getElementById('notificationBadge');
        if (!badge) return;

        this.unreadCount = this.notifications.filter(n => !n.read).length;
        
        if (this.unreadCount > 0) {
            badge.style.display = 'block';
            badge.textContent = this.unreadCount;
        } else {
            badge.style.display = 'none';
        }
    }

    renderNotifications() {
        const list = document.getElementById('notificationList');
        
        if (!this.notifications || this.notifications.length === 0) {
            list.innerHTML = '<div class="empty-message">No notifications</div>';
            return;
        }
        
        // No additional sorting here - use the already sorted notifications
        list.innerHTML = this.notifications.map(notification => {
            const content = this.getNotificationContent(notification);
            const timestamp = this.formatDateTime(notification.createdAt);
    
            return `
                <div class="notification-item ${notification.read ? 'read' : 'unread'}" 
                     data-id="${notification.id || ''}"
                     style="cursor: pointer;">
                    <div class="notification-title">
                        ${content.title}
                    </div>
                    <div class="notification-body">
                        ${content.body}
                    </div>
                    <div class="notification-time">${timestamp}</div>
                </div>
            `;
        }).join('');
    
        // Add click handlers
        const items = list.querySelectorAll('.notification-item');
        items.forEach(item => {
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                const notificationElement = e.currentTarget;
                if (notificationElement.classList.contains('unread')) {
                    notificationElement.classList.remove('unread');
                    notificationElement.classList.add('read');
                    this.markAsRead(notificationElement.dataset.id);
                }
            });
        });
    }

    cleanup() {
        if (this.unsubscribe) {
            this.unsubscribe();
        }
        
        this.notificationClickHandlers.forEach(handler => {
            document.removeEventListener('click', handler);
        });
        this.notificationClickHandlers.clear();
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.adminNotificationSystem = new AdminNotificationSystem();
    window.adminNotificationSystem.initialize();
});