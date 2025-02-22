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

class NotificationSystem {
    constructor() {
        this.notifications = [];
        this.unreadCount = 0;
        this.initialized = false;
        this.messaging = null;
        this.domInitialized = false;
        this.db = null;
        this.currentUserEmail = null;
        this.notificationClickHandlers = new Set(); // Track active click handlers
    }

    async initialize() {
        if (this.initialized) return;
    
        try {
            // Initialize Firebase services
            this.messaging = firebase.messaging();
            this.db = firebase.firestore();
            
            // Set up auth state listener
            this.setupAuthStateListener();
            
            // Wait for DOM to be ready
            await this.waitForDOM();
            
            // Set up UI event listeners
            this.setupEventListeners();
            
            this.initialized = true;
            console.log('✅ Notification system base initialization complete');
        } catch (error) {
            console.error('❌ Error initializing notification system:', error);
        }
    }

    setupAuthStateListener() {
        firebase.auth().onAuthStateChanged(async (user) => {
            if (user) {
                console.log('User signed in:', user.email);
                this.currentUserEmail = user.email;
                
                // Initialize notification-related features only after authentication
                await this.setupNotifications();
                await this.loadNotificationsFromFirestore();
                this.setupMessageHandlers();
                this.setupFirestoreListener();
            } else {
                console.log('User signed out');
                this.currentUserEmail = null;
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
            const currentUser = firebase.auth().currentUser;
            if (!currentUser) return;
    
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
                const token = await this.messaging.getToken({
                    vapidKey: 'BDfeRGFP6NM8-H8j3zlBCxgUdaYXGYZJ11bZ_z00tZN8DZEwFIl9-nP7eJo6khVDPqISEZuBin72IqhWMzL_Dv4'
                });
                
                // Only update the token in the existing document
                const employerRef = this.db.collection('employers').doc(currentUser.uid);
                const employerDoc = await employerRef.get();
                
                if (employerDoc.exists) {
                    await employerRef.update({
                        fcmToken: token,
                        lastTokenUpdate: firebase.firestore.FieldValue.serverTimestamp()
                    });
                    console.log('📱 FCM Token updated:', token);
                }
            }
        } catch (error) {
            console.error('❌ Error setting up notifications:', error);
        }
    }

    formatDateTime(timestamp) {
        if (!timestamp) return 'Invalid Date';
        
        let date;
        if (typeof timestamp === 'string') {
            // Handle ISO string format
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
        const timestamp = notification.timestamp;
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
            const currentUser = firebase.auth().currentUser;
            if (!currentUser) {
                console.log('❌ No current user found');
                return;
            }
    
            const notificationsSnapshot = await this.db
                .collection('sentNotifications')
                .doc(currentUser.uid)
                .collection('notifications')
                .where('deleted', '==', false)
                .orderBy('timestamp', 'desc')
                .get();
    
            this.notifications = notificationsSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                formattedTimestamp: this.formatDateTime(doc.data().timestamp)
            }));
    
            console.log('📬 Processed notifications:', this.notifications);
            this.updateUnreadCount();
            this.renderNotifications();
        } catch (error) {
            console.error('❌ Error loading notifications:', error);
            const list = document.getElementById('notificationList');
            if (list) {
                list.innerHTML = '<div class="empty-message">Unable to load notifications. Please try again later.</div>';
            }
        }
    }

    setupFirestoreListener() {
        const currentUser = firebase.auth().currentUser;
        if (!currentUser) {
            console.warn("⚠️ No authenticated user found.");
            return;
        }
    
        const notificationsRef = this.db
            .collection('sentNotifications')
            .doc(currentUser.uid)
            .collection('notifications');
        
        this.unsubscribe = notificationsRef
            .where('deleted', '==', false)
            .orderBy('timestamp', 'desc')
            .onSnapshot(
                (snapshot) => {
                    let updatedNotifications = [...this.notifications];
                    
                    snapshot.docChanges().forEach((change) => {
                        const notification = {
                            id: change.doc.id,
                            ...change.doc.data(),
                            formattedTimestamp: this.formatDateTime(change.doc.data().timestamp)
                        };

                        const existingIndex = updatedNotifications.findIndex(n => n.id === notification.id);

                        if (change.type === 'added' && existingIndex === -1) {
                            console.log('📩 New notification received:', notification);
                            updatedNotifications.push(notification);
                        } else if (change.type === 'modified' && existingIndex !== -1) {
                            console.log('🔄 Notification modified:', notification);
                            updatedNotifications[existingIndex] = notification;
                        } else if (change.type === 'removed' && existingIndex !== -1) {
                            console.log('🗑️ Notification removed:', notification);
                            updatedNotifications = updatedNotifications.filter(n => n.id !== notification.id);
                        }
                    });

                    this.notifications = this.sortNotifications(updatedNotifications);
                    this.updateUnreadCount();
                    this.renderNotifications();
                },
                (error) => {
                    console.error('❌ Firestore listener error:', error);
                }
            );
    }
    
    setupEventListeners() {
        // Clean up existing handlers
        this.notificationClickHandlers.forEach(handler => {
            document.removeEventListener('click', handler);
        });
        this.notificationClickHandlers.clear();

        // Bell click handler
        const bell = document.getElementById('notificationBell');
        const container = document.getElementById('notificationContainer');
        
        const bellClickHandler = (e) => {
            e.stopPropagation();
            container.style.display = container.style.display === 'block' ? 'none' : 'block';
        };
        
        bell?.addEventListener('click', bellClickHandler);
        this.notificationClickHandlers.add(bellClickHandler);
    
        // Close on outside click
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
        // Prevent duplicate message handlers
        if (this.messageHandlerSetup) return;
        
        this.messaging.onMessage((payload) => {
            console.log('📨 Received foreground message:', payload);
            
            // Show browser notification only if the app is not focused
            if (Notification.permission === 'granted' && document.visibilityState !== 'visible') {
                const notificationOptions = {
                    body: payload.notification.body,
                    data: payload.data,
                    requireInteraction: true,
                    tag: payload.data?.id || Date.now().toString(), // Use tag to prevent duplicates
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
    

    addNotificationToUI(notification) {
        const index = this.notifications.findIndex(n => n.id === notification.id);
        
        if (index === -1) {
            this.notifications.push(notification);
            this.notifications = this.sortNotifications(this.notifications);
        } else {
            this.notifications[index] = {
                ...this.notifications[index],
                ...notification
            };
            this.notifications = this.sortNotifications(this.notifications);
        }
        
        this.updateUnreadCount();
        this.renderNotifications();
        
        if (index === -1 && Notification.permission === 'granted') {
            this.showBrowserNotification(notification);
        }
    }


    removeNotificationFromUI(id) {
        this.notifications = this.notifications.filter(n => n.id !== id);
        this.updateUnreadCount();
        this.renderNotifications();
    }

    showBrowserNotification(notification) {
        navigator.serviceWorker.ready.then(registration => {
            registration.showNotification(
                `New Application: ${notification.jobTitle}`,
                {
                    body: `${notification.studentName} has applied to ${notification.jobTitle} at ${notification.companyName}`,
                    tag: notification.id,
                    requireInteraction: true,
                    vibrate: [200, 100, 200]
                }
            );
        });
    }

    async markAsRead(notificationId) {
        try {
            const currentUser = firebase.auth().currentUser;
            if (!currentUser) return;

            const notification = this.notifications.find(n => n.id === notificationId);
            if (!notification || notification.read) {
                return; // Skip if already read
            }

            await this.db
                .collection('sentNotifications')
                .doc(currentUser.uid)
                .collection('notifications')
                .doc(notificationId)
                .update({ 
                    read: true,
                    readAt: firebase.firestore.FieldValue.serverTimestamp()
                });

            // Update local state
            notification.read = true;
            this.updateUnreadCount();
            this.renderNotifications();
        } catch (error) {
            console.error('❌ Error marking notification as read:', error);
        }
    }

    async clearAll() {
        try {
            const currentUser = firebase.auth().currentUser;
            if (!currentUser) {
                console.warn('No user found');
                return;
            }
    
            // Get all notifications in the subcollection
            const notificationsRef = this.db
                .collection('sentNotifications')
                .doc(currentUser.uid)
                .collection('notifications');
    
            const snapshot = await notificationsRef.get();
            
            // Create a batch operation
            const batch = this.db.batch();
            
            // Add delete operations for each document to the batch
            snapshot.docs.forEach((doc) => {
                batch.delete(doc.ref);
            });
            
            // Execute all the deletes atomically
            await batch.commit();
    
            // Clear local notifications array
            this.notifications = [];
            
            // Update UI
            this.updateUnreadCount();
            this.renderNotifications();
            
            // Hide the notification container after clearing
            const container = document.getElementById('notificationContainer');
            if (container) {
                container.style.display = 'none';
            }
            
            console.log('✅ Successfully deleted all notifications');
        } catch (error) {
            console.error('❌ Error clearing notifications:', error);
        }
    }


    updateUnreadCount() {
        const badge = document.getElementById('notificationBadge');
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
        
        list.innerHTML = this.notifications.map(notification => {
            // Determine notification content based on type
            let titlePrefix, body;
            
            // Check if the notification type starts with 'offer_'
            if (notification.type?.startsWith('offer_')) {
                const offerStatus = notification.type.split('_')[1];
                
                switch (offerStatus) {
                    case 'declined':
                        titlePrefix = 'Offer Declined';
                        body = `${notification.studentName} has declined your offer for ${notification.jobTitle} position at ${notification.companyName}`;
                        break;
                    case 'accepted':
                        titlePrefix = 'Offer Accepted';
                        body = `${notification.studentName} has accepted your offer for ${notification.jobTitle} position at ${notification.companyName}`;
                        break;
                    case 'withdrawn':
                        titlePrefix = 'Application Withdrawn';
                        body = `${notification.studentName} has withdrawn their application for ${notification.jobTitle} position at ${notification.companyName}`;
                        break;
                    default:
                        titlePrefix = 'Offer Status Update';
                        body = `${notification.studentName} has updated their application status for ${notification.jobTitle} position at ${notification.companyName}`;
                }
            } else {
                // Default case for job applications
                titlePrefix = 'New Application';
                body = `${notification.studentName} has applied to ${notification.jobTitle} at ${notification.companyName}`;
            }
            
            // Construct the full title with job title for all notification types
            const fullTitle = `${titlePrefix}: ${notification.jobTitle || 'Unknown'}`;
            
            return `
                <div class="notification-item ${notification.read ? '' : 'unread'}" 
                     data-id="${notification.id}">
                    <div class="notification-title">
                        ${fullTitle}
                    </div>
                    <div class="notification-body">
                        ${body || 'No content available'}
                    </div>
                    <div class="notification-time">${notification.formattedTimestamp}</div>
                </div>
            `;
        }).join('');
    
        // Add click handlers
        const items = list.querySelectorAll('.notification-item');
        items.forEach(item => {
            const clickHandler = (e) => {
                e.stopPropagation();
                if (!item.classList.contains('read')) {
                    this.markAsRead(item.dataset.id);
                }
            };
            
            item.addEventListener('click', clickHandler);
            this.notificationClickHandlers.add(clickHandler);
        });
    }

    cleanup() {
        if (this.unsubscribe) {
            this.unsubscribe();
        }
        
        // Remove all event listeners
        this.notificationClickHandlers.forEach(handler => {
            document.removeEventListener('click', handler);
        });
        this.notificationClickHandlers.clear();
    }
}

firebase.auth().onAuthStateChanged((user) => {
    if (user) {
        console.log('User is signed in:', user.email);
    } else {
        console.log('No user is signed in');
    }
});

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.notificationSystem = new NotificationSystem();
    window.notificationSystem.initialize();
});

