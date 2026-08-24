/* Minimal service worker — enables Android “Install app” / Add to Home screen */
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

/* Empty handler: satisfies install criteria without intercepting network traffic */
self.addEventListener('fetch', () => {});
