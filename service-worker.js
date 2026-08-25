const CACHE_NAME = "vocal-warmup-v3";

// Large, immutable assets: fine to serve straight from cache once fetched.
const CACHE_FIRST_URLS = [
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
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/icon-maskable-512.png",
  "icons/apple-touch-icon.png",
  "favicon.ico",
];

// The app shell: changes on every deploy, so prefer the network and only
// fall back to the cache when offline.
const NETWORK_FIRST_URLS = ["./", "index.html", "styles.css", "js/app.js", "js/audio.js", "js/exercises.js", "js/scheduler.js", "manifest.json"];

const PRECACHE_URLS = [...NETWORK_FIRST_URLS, ...CACHE_FIRST_URLS];

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

function isCacheFirst(pathname) {
  return CACHE_FIRST_URLS.some((url) => pathname.endsWith(url));
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(CACHE_NAME);
    cache.put(request, response.clone());
  }
  return response;
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    const cached = await caches.match(request);
    if (cached) return cached;
    throw err;
  }
}

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const { pathname } = new URL(event.request.url);
  event.respondWith(isCacheFirst(pathname) ? cacheFirst(event.request) : networkFirst(event.request));
});
