import { precacheAndRoute } from 'workbox-precaching'
import { registerRoute } from 'workbox-routing'
import { CacheFirst, StaleWhileRevalidate, NetworkFirst } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'

// Precache assets
precacheAndRoute([
  { url: '/', revision: '1' },
  { url: '/manifest.json', revision: '1' },
  { url: '/favicon.ico', revision: '1' },
  { url: '/apple-touch-icon.png', revision: '1' },
  { url: '/pwa-192x192.png', revision: '1' },
  { url: '/pwa-512x512.png', revision: '1' },
])

// Cache static assets
registerRoute(
  /\.(?:png|jpg|jpeg|svg|gif|ico|webp|avif)$/,
  new CacheFirst({
    cacheName: 'static-assets',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
      }),
    ],
  })
)

// Cache CSS and JS files
registerRoute(
  /\.(?:css|js)$/,
  new StaleWhileRevalidate({
    cacheName: 'static-resources',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 24 * 60 * 60, // 24 hours
      }),
    ],
  })
)

// Cache Google Fonts
registerRoute(
  /^https:\/\/fonts\.googleapis\.com\/.*/,
  new CacheFirst({
    cacheName: 'google-fonts',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 4,
        maxAgeSeconds: 365 * 24 * 60 * 60, // 365 days
      }),
    ],
  })
)

registerRoute(
  /^https:\/\/fonts\.gstatic\.com\/.*/,
  new CacheFirst({
    cacheName: 'google-fonts-static',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 4,
        maxAgeSeconds: 365 * 24 * 60 * 60, // 365 days
      }),
    ],
  })
)

// Cache API responses with NetworkFirst strategy
registerRoute(
  /\/api\/.*$/,
  new NetworkFirst({
    cacheName: 'api-responses',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 5 * 60, // 5 minutes
      }),
    ],
  })
)

// Cache performance monitoring data
registerRoute(
  ({ url }) => url.pathname.includes('/performance'),
  new NetworkFirst({
    cacheName: 'performance-data',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 20,
        maxAgeSeconds: 30 * 60, // 30 minutes
      }),
    ],
  })
)

// Cache embedding and vector data
registerRoute(
  ({ url }) => url.pathname.includes('/embeddings') || url.pathname.includes('/vectors'),
  new StaleWhileRevalidate({
    cacheName: 'vector-data',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 60 * 60, // 1 hour
      }),
    ],
  })
)

// Cache code editor assets
registerRoute(
  ({ url }) => url.pathname.includes('/monaco') || url.pathname.includes('/editor'),
  new CacheFirst({
    cacheName: 'editor-assets',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 200,
        maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
      }),
    ],
  })
)

// Handle offline fallback
registerRoute(
  ({ event }) => event.request.mode === 'navigate',
  async ({ event }) => {
    try {
      return await fetch(event.request)
    } catch (error) {
      // Return offline page when network fails
      return caches.match('/offline.html')
    }
  }
)

// Skip waiting and claim clients immediately
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

// Handle background sync for offline actions
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(syncOfflineData())
  }
})

async function syncOfflineData() {
  // Implement background sync logic here
  console.log('Background sync triggered')
}