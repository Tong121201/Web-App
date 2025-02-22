// firebase-messaging-sw.js
importScripts('https://cdnjs.cloudflare.com/ajax/libs/firebase/10.8.0/firebase-app-compat.min.js');
importScripts('https://cdnjs.cloudflare.com/ajax/libs/firebase/10.8.0/firebase-messaging-compat.min.js');

// Initialize the Firebase app in the service worker
firebase.initializeApp({
    apiKey: "AIzaSyDOtb-QtwEqIaWPYOjvGsS4HGycXhZ8eZw",
    authDomain: "myproject-9638b.firebaseapp.com",
    projectId: "myproject-9638b",
    storageBucket: "myproject-9638b.appspot.com",
    messagingSenderId: "419251176337",
    appId: "1:419251176337:web:2e33df046378ef6c651030"
});

const messaging = firebase.messaging();

// Define cache version and name
const CACHE_VERSION = 'v1';
const CACHE_NAME = `fcm-notification-${CACHE_VERSION}`;

// Only cache the essential files that we know exist
const RESOURCES_TO_CACHE = [
    '/homepage.html'  // Only cache the main HTML file
];

// Installation event handler with better error handling
self.addEventListener('install', (event) => {
    console.log('[Service Worker] Installing Service Worker...', event);
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('[Service Worker] Caching app shell');
                
                // Cache files one by one with error handling
                return Promise.all(
                    RESOURCES_TO_CACHE.map(url => {
                        return fetch(url)
                            .then(response => {
                                if (!response.ok) {
                                    throw new Error(`Failed to fetch ${url}`);
                                }
                                return cache.put(url, response);
                            })
                            .catch(error => {
                                console.warn(`[Service Worker] Failed to cache ${url}:`, error);
                                // Continue even if one file fails to cache
                                return Promise.resolve();
                            });
                    })
                );
            })
            .catch(error => {
                console.error('[Service Worker] Cache installation failed:', error);
            })
    );
    
    // Activate the service worker immediately
    self.skipWaiting();
});

// Activation event handler
self.addEventListener('activate', event => {
    console.log('[Service Worker] Activating Service Worker...', event);
    
    event.waitUntil(
        Promise.all([
            // Take control of all pages immediately
            clients.claim(),
            
            // Clear old caches
            caches.keys().then(cacheNames => {
                return Promise.all(
                    cacheNames.map(cacheName => {
                        if (cacheName !== CACHE_NAME) {
                            console.log('[Service Worker] Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
        ])
        .then(() => {
            console.log('[Service Worker] Activation complete - claiming clients');
        })
        .catch(error => {
            console.error('[Service Worker] Activation failed:', error);
        })
    );
});

// Background message handler
messaging.onBackgroundMessage(function(payload) {
    console.log('[Service Worker] Received background message:', payload);

    const notificationOptions = {
        body: payload.notification.body,
        data: payload.data,
        tag: payload.data?.tag || 'default-tag',
        requireInteraction: true,
        vibrate: [200, 100, 200],
    };

    return self.registration.showNotification(
        payload.notification.title,
        notificationOptions
    ).then(() => {
        console.log('[Service Worker] Background notification displayed successfully');
    }).catch(error => {
        console.error('[Service Worker] Error displaying background notification:', error);
    });
});

// Notification click handler
self.addEventListener('notificationclick', function(event) {
    console.log('[Service Worker] Notification clicked:', event);
    
    event.notification.close();
    
    const urlToOpen = event.notification.data?.url || '/';
    
    event.waitUntil(
        clients.matchAll({
            type: 'window',
            includeUncontrolled: true
        })
        .then(function(clientList) {
            for (let client of clientList) {
                if (client.url === urlToOpen && 'focus' in client) {
                    return client.focus();
                }
            }
            return clients.openWindow(urlToOpen);
        })
        .catch(error => {
            console.error('[Service Worker] Error handling notification click:', error);
        })
    );
});

// Handle errors
self.addEventListener('error', function(event) {
    console.error('[Service Worker] Error:', event.error);
});

// Handle unhandled rejections
self.addEventListener('unhandledrejection', function(event) {
    console.error('[Service Worker] Unhandled rejection:', event.reason);
});