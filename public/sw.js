// Le Hive Management — Service Worker
// Handles: PWA install, offline task caching, push notifications

const CACHE_NAME = "le-hive-v1";
const STATIC_ASSETS = ["/", "/ce-soir", "/planning", "/debrief"];

// Install — pre-cache app shell
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate — clean old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch — network-first for API, cache-first for static
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET requests
  if (event.request.method !== "GET") return;

  // Supabase API calls — network only (realtime data)
  if (url.hostname.includes("supabase")) return;

  // App pages and assets — network first, fallback to cache
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache successful responses
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

// Push notification received
self.addEventListener("push", (event) => {
  if (!event.data) return;

  const data = event.data.json();
  const { title, body, url } = data;

  event.waitUntil(
    self.registration.showNotification(title || "Le Hive", {
      body: body || "",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      data: { url: url || "/ce-soir" },
      vibrate: [200, 100, 200],
    })
  );
});

// Notification click — open app at specified URL
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/ce-soir";

  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clients) => {
      // Focus existing window if open
      for (const client of clients) {
        if (client.url.includes(url) && "focus" in client) {
          return client.focus();
        }
      }
      // Otherwise open new window
      return self.clients.openWindow(url);
    })
  );
});
