self.addEventListener('install', event => {
  self.skipWaiting()
})

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('push', event => {
  if (!event.data) return
  const payload = (() => {
    try {
      return event.data.json()
    } catch {
      return { title: 'Notificacion', body: event.data.text() }
    }
  })()

  const title = payload.title || 'Notificacion'
  const options = {
    body: payload.body || '',
    icon: payload.icon || '/logo.png',
    badge: payload.badge || '/logo.png',
    data: payload.data || {},
    tag: payload.tag || undefined,
    requireInteraction: payload.requireInteraction || false,
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  const targetUrl = event.notification.data?.url || '/dashboard'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.navigate(targetUrl)
          return client.focus()
        }
      }
      return self.clients.openWindow(targetUrl)
    })
  )
})
