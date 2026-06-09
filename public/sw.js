// ─── Cache shell ─────────────────────────────────────────────────────────────

const CACHE_NAME = "creator-board-shell-v4";
const SHELL_ASSETS = ["/", "/index.html", "/manifest.webmanifest", "/logo-creator-board.webp"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(SHELL_ASSETS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put("/", copy));
          return response;
        })
        .catch(() => caches.match("/") || caches.match("/index.html")),
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;
      return fetch(event.request).then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return response;
      });
    }),
  );
});

// ─── Push notifications ───────────────────────────────────────────────────────

self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data?.json() ?? {}; } catch { data = { body: event.data?.text() }; }

  const title = data.title || "Creator Board";
  const options = {
    body: data.body || "Você tem vídeos esperando por você!",
    icon: "/logo-creator-board.webp",
    badge: "/logo-creator-board.webp",
    tag: data.tag || "creator-board-push",
    renotify: Boolean(data.renotify),
    silent: false,
    vibrate: [200, 100, 200],
    data: { url: data.url || "/" },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// ─── Notification click → open / focus the app ───────────────────────────────

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        // If app tab already open, focus it
        for (const client of clients) {
          if (client.url.startsWith(self.location.origin) && "focus" in client) {
            return client.focus();
          }
        }
        // Otherwise open a new tab
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
      }),
  );
});

// ─── Periodic Background Sync (Chrome PWA) ───────────────────────────────────
// Fires ~every 12–24h when the app is installed as PWA and the browser is running
// even if no tab is open.

self.addEventListener("periodicsync", (event) => {
  if (event.tag === "creator-board-daily") {
    event.waitUntil(handlePeriodicSync());
  }
});

async function handlePeriodicSync() {
  const payload = await getIdbPayload();
  if (!payload) return;

  // Don't show if already shown today
  const todayKey = new Date().toISOString().slice(0, 10);
  if (payload.lastShownDate === todayKey) return;

  // Only show between 7am and 10pm
  const hour = new Date().getHours();
  if (hour < 7 || hour >= 22) return;

  await self.registration.showNotification(payload.title || "Creator Board", {
    body: payload.body || "Hora de criar conteúdo! 🎬",
    icon: "/logo-creator-board.webp",
    badge: "/logo-creator-board.webp",
    tag: "creator-board-daily",
    renotify: true,
    vibrate: [200, 100, 200],
    data: { url: "/" },
  });
}

// ─── IndexedDB helpers (SW context — no localStorage access) ─────────────────

const IDB_NAME = "creator-board-sw-db";
const IDB_STORE = "notifications";
const IDB_KEY = "daily-payload";

function openIdb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = (e) => {
      e.target.result.createObjectStore(IDB_STORE);
    };
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = () => reject(req.error);
  });
}

async function getIdbPayload() {
  try {
    const db = await openIdb();
    return new Promise((resolve) => {
      const tx = db.transaction(IDB_STORE, "readonly");
      const get = tx.objectStore(IDB_STORE).get(IDB_KEY);
      get.onsuccess = () => resolve(get.result ?? null);
      get.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

// Message handler: main thread can send { type: "SET_PAYLOAD", payload: {...} }
self.addEventListener("message", (event) => {
  if (event.data?.type === "SET_PAYLOAD") {
    setIdbPayload(event.data.payload).catch(() => {});
  }
  if (event.data?.type === "SHOW_NOTIFICATION") {
    const { title, body, tag } = event.data;
    self.registration.showNotification(title || "Creator Board", {
      body: body || "Hora de trabalhar!",
      icon: "/logo-creator-board.webp",
      badge: "/logo-creator-board.webp",
      tag: tag || "creator-board-manual",
      renotify: true,
      vibrate: [200, 100, 200],
      data: { url: "/" },
    }).catch(() => {});
  }
});

async function setIdbPayload(payload) {
  const db = await openIdb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, "readwrite");
    const put = tx.objectStore(IDB_STORE).put(payload, IDB_KEY);
    put.onsuccess = () => resolve();
    put.onerror = () => reject(put.error);
  });
}
