const CACHE_NAME = "vocal-warmup-v1";

const PRECACHE_URLS = [
  "./",
  "index.html",
  "styles.css",
  "js/app.js",
  "js/audio.js",
  "js/exercises.js",
  "js/scheduler.js",
  "manifest.json",
  "samples/piano/A2.mp3",
  "samples/piano/C3.mp3",
  "samples/piano/Ds3.mp3",
  "samples/piano/Fs3.mp3",
  "samples/piano/A3.mp3",
  "samples/piano/C4.mp3",
  "samples/piano/Ds4.mp3",
  "samples/piano/Fs4.mp3",
  "samples/piano/A4.mp3",
  "samples/piano/C5.mp3",
  "samples/piano/Ds5.mp3",
  "samples/piano/Fs5.mp3",
  "samples/piano/A5.mp3",
  "samples/piano/C6.mp3",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) => Promise.all(names.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return response;
      });
    })
  );
});
