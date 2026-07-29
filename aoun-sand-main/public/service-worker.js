/* ============================================================
   service-worker.js — aoun-sand PWA v3
   Handles: caching, push (background), notification clicks
   ============================================================ */

const CACHE_NAME   = 'aoun-sand-v3';
const OFFLINE_PAGE = '/offline.html';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

/* ── Install ── */
self.addEventListener('install', (evt) => {
  evt.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

/* ── Activate ── */
self.addEventListener('activate', (evt) => {
  evt.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

/* ── Fetch (Network-first for HTML, Cache-first for assets) ── */
self.addEventListener('fetch', (evt) => {
  if (evt.request.method !== 'GET') return;
  if (!evt.request.url.startsWith('http')) return;

  if (evt.request.mode === 'navigate') {
    evt.respondWith(
      fetch(evt.request).catch(() => caches.match(OFFLINE_PAGE))
    );
  } else if (evt.request.destination === 'image' || evt.request.destination === 'font') {
    // Cache-first for static assets
    evt.respondWith(
      caches.match(evt.request).then((r) => r || fetch(evt.request).then((res) => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(evt.request, clone));
        }
        return res;
      }))
    );
  }
});

/* ── Background Push Notification (from Edge Function / VAPID) ── */
self.addEventListener('push', (evt) => {
  let payload = {
    title: 'إشعار جديد — عون وسند',
    message: 'لديك رسالة جديدة',
    link: '/',
    media_url: null,
  };

  try {
    if (evt.data) {
      const data = evt.data.json();
      payload = { ...payload, ...data };
    }
  } catch (e) {
    try {
      payload.message = evt.data?.text() || payload.message;
    } catch {}
  }

  const options = {
    body: payload.message,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-72.png',
    image: payload.media_url || undefined,
    data: { url: payload.link || '/' },
    dir: 'auto',
    lang: 'ar',
    vibrate: [300, 100, 300, 100, 300],
    requireInteraction: false,
    silent: false,
    tag: 'aoun-sand-push',          // replaces previous notification
    renotify: true,                  // vibrates even if same tag
    actions: [
      { action: 'open',  title: '📖 فتح' },
      { action: 'close', title: '✕ إغلاق' },
    ],
  };

  evt.waitUntil(
    self.registration.showNotification(payload.title, options)
  );
});

/* ── Notification Click ── */
self.addEventListener('notificationclick', (evt) => {
  evt.notification.close();
  if (evt.action === 'close') return;

  const url = evt.notification.data?.url || '/';

  evt.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Focus existing window if any
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus();
          client.postMessage({ type: 'NOTIF_CLICK', url });
          return;
        }
      }
      // Open new window
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});

/* ── Push Subscription Change (auto-renew) ── */
self.addEventListener('pushsubscriptionchange', (evt) => {
  evt.waitUntil(
    self.registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: evt.oldSubscription?.options?.applicationServerKey,
    }).then((sub) => {
      // Notify main app to update DB
      clients.matchAll().then((cs) => {
        cs.forEach((c) => c.postMessage({ type: 'PUSH_SUB_CHANGED', subscription: sub.toJSON() }));
      });
    }).catch(console.warn)
  );
});
