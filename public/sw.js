// Service Worker for AI Dev Workspace
// Handles PWA functionality, offline caching, and live preview

const CACHE_NAME = 'ai-dev-workspace-v1';
const PREVIEW_CACHE = 'preview-projects';

// Assets to cache immediately
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json'
];

// Preview project files storage
const previewProjects = new Map();

// Install event - cache essential assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== PREVIEW_CACHE) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Handle preview requests
  if (url.pathname.startsWith('/preview/')) {
    event.respondWith(handlePreviewRequest(event.request, url));
    return;
  }

  // Handle API requests - always use network
  if (url.pathname.startsWith('/api/') || 
      url.hostname.includes('googleapis.com') ||
      url.hostname.includes('openai.com') ||
      url.hostname.includes('github.com')) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Handle static assets with cache-first strategy
  event.respondWith(
    caches.match(event.request).then((response) => {
      if (response) {
        return response;
      }

      return fetch(event.request).then((response) => {
        // Cache successful responses
        if (response && response.status === 200) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      });
    }).catch(() => {
      // Offline fallback
      if (event.request.mode === 'navigate') {
        return caches.match('/index.html');
      }
    })
  );
});

// Handle preview requests for live preview feature
async function handlePreviewRequest(request, url) {
  const pathParts = url.pathname.split('/');
  const projectId = pathParts[2];
  const filePath = pathParts.slice(3).join('/') || 'index.html';

  // Get project files from message or cache
  const projectFiles = previewProjects.get(projectId);
  
  if (!projectFiles) {
    return new Response('Preview not available', { status: 404 });
  }

  // Serve requested file
  const fileContent = projectFiles[filePath];
  
  if (!fileContent) {
    // Try index.html for SPA fallback
    const indexContent = projectFiles['index.html'];
    if (indexContent) {
      return new Response(indexContent, {
        headers: { 'Content-Type': 'text/html' }
      });
    }
    return new Response('File not found', { status: 404 });
  }

  // Determine content type
  const contentType = getContentType(filePath);
  
  return new Response(fileContent, {
    headers: { 'Content-Type': contentType }
  });
}

// Get content type based on file extension
function getContentType(filePath) {
  const ext = filePath.split('.').pop().toLowerCase();
  const types = {
    'html': 'text/html',
    'css': 'text/css',
    'js': 'application/javascript',
    'json': 'application/json',
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'gif': 'image/gif',
    'svg': 'image/svg+xml',
    'ico': 'image/x-icon',
    'woff': 'font/woff',
    'woff2': 'font/woff2',
    'ttf': 'font/ttf',
    'eot': 'application/vnd.ms-fontobject'
  };
  return types[ext] || 'text/plain';
}

// Message handler for setup commands
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'setup-preview') {
    const { projectId, files } = event.data;
    previewProjects.set(projectId, files);
    
    // Notify client that preview is ready
    event.ports[0].postMessage({ ready: true });
  }

  if (event.data && event.data.type === 'update-preview') {
    const { projectId, files } = event.data;
    previewProjects.set(projectId, files);
    
    // Broadcast update to all preview windows
    self.clients.matchAll({ includeUncontrolled: true }).then((clients) => {
      clients.forEach((client) => {
        if (client.url.includes(`/preview/${projectId}`)) {
          client.postMessage({ type: 'reload' });
        }
      });
    });
  }

  if (event.data && event.data.type === 'clear-preview') {
    const { projectId } = event.data;
    previewProjects.delete(projectId);
  }
});

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-github') {
    event.waitUntil(syncGitHubChanges());
  }
});

async function syncGitHubChanges() {
  // Get pending changes from IndexedDB
  // Push to GitHub when online
  console.log('Syncing GitHub changes...');
}

// Push notifications (future feature)
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  
  const options = {
    body: data.body || 'New notification',
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    data: data.data || {}
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'AI Dev Workspace', options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  event.waitUntil(
    clients.openWindow(event.notification.data.url || '/')
  );
});
