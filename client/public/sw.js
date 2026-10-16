// Minimal service worker for installability. Network-first: LIVE, API, videos and music remain online.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {});