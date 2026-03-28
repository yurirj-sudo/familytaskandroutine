/// <reference lib="webworker" />
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { initializeApp } from 'firebase/app';
import { getMessaging, onBackgroundMessage } from 'firebase/messaging/sw';

declare const self: ServiceWorkerGlobalScope;

// ─── Workbox precache ─────────────────────────────────────────────────────────
// self.__WB_MANIFEST is injected by vite-plugin-pwa at build time

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST || []);

// ─── Firebase background messaging ───────────────────────────────────────────

const firebaseApp = initializeApp({
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
});

const messaging = getMessaging(firebaseApp);

onBackgroundMessage(messaging, (payload) => {
  const title = payload.notification?.title ?? 'FamilyQuest';
  const body = payload.notification?.body ?? '';
  const icon = payload.notification?.icon ?? '/icon-192.png';

  self.registration.showNotification(title, {
    body,
    icon,
    badge: '/icon-192.png',
    data: payload.data,
  });
});

// ─── Notification click — focus or open app ───────────────────────────────────

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  event.waitUntil(
    (self.clients as Clients).matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      const existingWindow = clientList.find((client) => client.url.includes(self.location.origin));
      if (existingWindow) {
        return existingWindow.focus();
      }
      return (self.clients as Clients).openWindow('/home');
    })
  );
});
