const CACHE_NAME = 'uchat-v6';
const ASSETS = [
    './',
    './index.html',
    './style.css',
    './app.js',
    './manifest.json'
];

self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
    );
});

self.addEventListener('fetch', (e) => {
    e.respondWith(
        caches.match(e.request).then((response) => response || fetch(e.request))
    );
});

// Handle notification clicks - Open app and navigate if possible
self.addEventListener('notificationclick', (e) => {
    const notification = e.notification;
    const action = e.action;
    const data = notification.data || {};

    notification.close();

    e.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
            // If app is already open, focus it
            for (let client of windowClients) {
                if (client.url.includes(location.origin) && 'focus' in client) {
                    return client.focus();
                }
            }
            // If not open, open it
            if (clients.openWindow) {
                return clients.openWindow('./');
            }
        })
    );
});

// Handle push notifications (for future Firebase Cloud Messaging support)
self.addEventListener('push', (e) => {
    const data = e.data ? e.data.json() : {};
    const title = data.title || 'U-CHAT';
    const options = {
        body: data.body || 'You have a new message',
        icon: './icon.png',
        badge: './icon.png',
        vibrate: [200, 100, 200],
        tag: 'uchat-message',
        requireInteraction: false
    };

    e.waitUntil(
        self.registration.showNotification(title, options)
    );
});
