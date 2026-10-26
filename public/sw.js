// Ascension 999 — background helper for notifications.
// The server sends an empty "wake up" push; this fetches the waiting messages and shows them.
// (It doesn't cache anything — the game itself always loads fresh.)
const PUSH_SERVER = 'https://ascension-999-push.ascension-999-push.workers.dev';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

async function deviceId() {
  const sub = await self.registration.pushManager.getSubscription();
  if (!sub) return null;
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(sub.endpoint));
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

self.addEventListener('push', (event) => {
  event.waitUntil((async () => {
    let notes = [];
    try {
      const id = await deviceId();
      if (id) notes = await (await fetch(`${PUSH_SERVER}/inbox?device=${id}`)).json();
    } catch { /* show a gentle fallback below */ }
    if (!notes.length) notes = [{ title: 'Ascension 999', body: 'Something in your game needs you.', tag: 'a999' }];
    for (const n of notes.slice(0, 4)) {
      await self.registration.showNotification(n.title, {
        body: n.body,
        tag: n.tag,
        icon: 'icon-192.png',
        badge: 'icon-192.png',
        data: { url: self.registration.scope },
      });
    }
  })());
});

// Tapping a notification opens the game (or brings it to the front).
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const open = all.find((c) => c.url.startsWith(self.registration.scope));
    if (open) return open.focus();
    return self.clients.openWindow(event.notification.data?.url ?? self.registration.scope);
  })());
});
