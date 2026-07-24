const CACHE_NAME = 'community-guide-v17-1';
const APP_FILES = [
  './','./index.html','./admin.html','./manifest.webmanifest',
  './css/style.css','./css/admin.css','./js/app.js','./js/admin.js',
  './data/community-data.json','./assets/community-map.png',
  './icons/icon-192.png','./icons/icon-512.png','./icons/apple-touch-icon.png'
];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_FILES)));
  self.skipWaiting();
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  const isFreshFirst = event.request.mode === 'navigate' || url.pathname.endsWith('/data/community-data.json') || url.pathname.endsWith('.html');
  if (isFreshFirst) {
    event.respondWith(fetch(event.request).then(response => {
      const copy=response.clone(); caches.open(CACHE_NAME).then(cache=>cache.put(event.request,copy)); return response;
    }).catch(() => caches.match(event.request).then(cached => cached || caches.match('./index.html'))));
    return;
  }
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request).then(response => {
    const copy=response.clone(); caches.open(CACHE_NAME).then(cache=>cache.put(event.request,copy)); return response;
  })));
});
