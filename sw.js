const CACHE_NAME = 'khader-v1';
const ASSETS = [
    '/',
    '/index.html',
    '/shop.html',
    '/product.html',
    '/cart.html',
    '/contact.html',
    '/style.css',
    '/script.js',
    '/images/logo.png'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS);
        })
    );
    self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request);
        })
    );
});
