/* ==========================================================================
   COBRO-FIRME — SERVICE WORKER PARA COMPUTADORA Y PWA WEB (sw.js)
   Soporte para Aplicación de Escritorio y Notificaciones Nativas en Segundo Plano
   ========================================================================== */

const CACHE_NAME = 'cobro-firme-v1';

// 1. Instalación inmediata
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// 2. Activación y toma de control inmediata de todos los clientes
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      await self.clients.claim();
    })()
  );
});

// 3. Recepción de mensajes desde la app React (para disparar avisos web en el SO)
self.addEventListener('message', (event) => {
  if (!event.data) return;

  if (event.data.type === 'SHOW_WEB_NOTIFICATION') {
    const { title, options } = event.data.payload || {};
    const notificationTitle = title || 'Cobro-Firme';
    const notificationOptions = {
      icon: '/icon-192.png',
      badge: '/icon.svg',
      vibrate: [100, 50, 100],
      tag: options?.tag || 'cobro-firme-alert',
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

// 4. Clic en la notificación nativa de Windows / macOS
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const notificationData = event.notification.data || {};

  event.waitUntil(
    (async () => {
      // Buscar ventanas abiertas de Cobro-Firme
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

