const CACHE_NAME = '3xxx-words-v1';
const urlsToCache = [
  './',
  './vocab.html',
  './assets/images/man.png',
  // เพิ่มไฟล์อื่นๆ ที่ต้องการให้ทำงาน offline
  './assets/images/dictionary.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version or fetch from network
        return response || fetch(event.request);
      }
    )
  );
});