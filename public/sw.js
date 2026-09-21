self.addEventListener('push', (event) => {
  if (!event.data) return;
  let payload = { title: 'Nortvira', body: '' };
  try {
    payload = event.data.json();
  } catch {
    payload.body = event.data.text();
  }

  event.waitUntil(
    self.registration.showNotification(payload.title || 'Nortvira', {
      body: payload.body,
      icon: '/icon.png',
      badge: '/icon.png',
      data: { url: payload.url || '/hoy' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/hoy';
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(url) && 'focus' in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});
