/* GS PLAYER offline shell cache. Streaming URLs are never cached. */
var CACHE_NAME = 'gs-player-shell-v0.8.5';
var SHELL = ['./', './index.html', './style.css', './app.js', './manifest.webmanifest', './icon.png'];
self.addEventListener('install', function (event) {
  event.waitUntil(caches.open(CACHE_NAME).then(function (cache) { return cache.addAll(SHELL); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (event) {
  event.waitUntil(caches.keys().then(function (keys) { return Promise.all(keys.map(function (key) { if (key !== CACHE_NAME) return caches.delete(key); })); }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (event) {
  var request = event.request;
  if (request.method !== 'GET') return;
  var url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  event.respondWith(caches.match(request).then(function (cached) {
    if (cached && url.pathname !== '/' && !/\/(?:index\.html|app\.js|style\.css)$/.test(url.pathname)) return cached;
    return fetch(request).then(function (response) {
      if (response && response.ok) { var copy = response.clone(); caches.open(CACHE_NAME).then(function (cache) { cache.put(request, copy); }); }
      return response;
    });
  }));
});
