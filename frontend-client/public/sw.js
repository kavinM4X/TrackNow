/* Minimal service worker — enables Android “Install app” / Add to Home screen */
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  let url;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }

  // Do not intercept API, extensions, or other origins — avoids "Failed to fetch" in console
  if (url.origin !== self.location.origin) return;
  if (!url.protocol.startsWith('http')) return;

  event.respondWith(
    fetch(request).catch(() => new Response('', { status: 503, statusText: 'Offline' }))
  );
});
