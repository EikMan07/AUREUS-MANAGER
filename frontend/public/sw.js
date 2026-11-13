/* ==========================================================================
   AUREUS MANAGER — SERVICE WORKER PARA COMPUTADORA Y PWA WEB
   Soporte para Aplicación de Escritorio y Notificaciones Nativas en Segundo Plano
   ========================================================================== */

const CACHE_NAME = 'aureus-manager-v3';

// 1. Instalación inmediata
self.addEventListener('install', () => {
  self.skipWaiting();
});

// 2. Activación, limpieza de cachés antiguos y toma de control inmediata de todos los clientes
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

// 3. Recepción de mensajes desde la app React (para disparar avisos web en el SO)
self.addEventListener('message', (event) => {
  if (!event.data) return;

  if (event.data.type === 'SHOW_WEB_NOTIFICATION') {
    const { title, options } = event.data.payload || {};
    const notificationTitle = title || 'Aureus Manager';
    const notificationOptions = {
      icon: '/icon-192.png?v=aureus3',
      badge: '/icon.svg?v=aureus3',
      vibrate: [100, 50, 100],
      tag: options?.tag || 'aureus-manager-alert',
      renotify: true,
      requireInteraction: false,
      silent: false,
      ...options,
      data: options?.data || {}
    };

    event.waitUntil(
      self.registration.showNotification(notificationTitle, notificationOptions)
    );
  }
});

// 4. Clic en la notificación nativa del sistema
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const notificationData = event.notification.data || {};

  event.waitUntil(
    (async () => {
      // Buscar ventanas abiertas de Aureus Manager
      const clientList = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true
      });

      // Si ya hay una ventana abierta, enfocarla y enviarle el mensaje para navegar
      for (const client of clientList) {
        if ('focus' in client) {
          await client.focus();
          client.postMessage({
            type: 'NOTIFICATION_NAVIGATE',
            data: notificationData
          });
          return;
        }
      }

      // Si no hay ventana abierta, abrir una nueva en la raíz
      if (self.clients.openWindow) {
        const newClient = await self.clients.openWindow('/');
        if (newClient && 'focus' in newClient) {
          await newClient.focus();
        }
      }
    })()
  );
});
