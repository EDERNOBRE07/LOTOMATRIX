const CACHE_NAME = 'lotosniper-cache-v2';
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/favicon.svg',
  '/pwa-192x192.png',
  '/pwa-512x512.png',
  '/pwa-maskable-512x512.png',
  '/apple-touch-icon.png',
  '/manifest.json'
];

// Install: Cache App Shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_URLS).catch((err) => {
        console.warn('Falha parcial no precache de ativos estáticos:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// Activate: Clean up old caches & claim clients immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: Stale-While-Revalidate / Cache-First for assets, Network-First for navigation
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Skip non-GET requests and browser extensions
  if (request.method !== 'GET' || !url.protocol.startsWith('http')) {
    return;
  }

  // HTML Navigation: Network first with Cache fallback for 100% offline support
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) return cached;
          const fallback = await caches.match('/index.html');
          if (fallback) return fallback;
          return caches.match('/');
        })
    );
    return;
  }

  // Google Fonts, Static Scripts, Styles, and Images: Stale-While-Revalidate
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});

// Message Listener: Allows frontend to trigger persistent background notifications & audits
self.addEventListener('message', (event) => {
  if (!event.data) return;

  const { type, title, options, draw, totalHits, winningCount } = event.data;

  // Rich Audit Notification for Saved Games
  if (
    type === 'AUDIT_ALL_SAVED_GAMES' ||
    type === 'TEST_PUSH_NOW' ||
    type === 'BACKUP_RESTORE_AUDIT' ||
    type === 'CAIXA_NEW_DRAW_AUDIT' ||
    type === 'SHOW_SAVED_GAMES_NOTIFICATION'
  ) {
    const notifTitle =
      title ||
      (winningCount && winningCount > 0
        ? `🎉 Lotofácil #${draw?.concurso || ''}: ${winningCount} Bilhetes Premiados!`
        : `🎯 Lotofácil #${draw?.concurso || ''}: Jogos Salvos Auditados`);

    const defaultOptions = {
      body:
        options?.body ||
        `Auditoria concluída com sucesso: todos os seus jogos salvos foram conferidos contra o resultado oficial da Caixa.`,
      icon: '/favicon.svg',
      badge: '/favicon.svg',
      tag: 'lotosniper-audit-summary',
      renotify: true,
      requireInteraction: true,
      vibrate: [300, 100, 300, 100, 300],
      data: {
        url: '/#jogos',
        tab: 'jogos',
        section: 'fechamentos_salvos',
        concurso: draw?.concurso,
        totalHits: totalHits,
        winningCount: winningCount,
      },
      actions: [
        { action: 'conferir', title: '🎯 Conferir Jogos' },
        { action: 'fechar', title: 'Fechar' },
      ],
      ...options,
    };

    event.waitUntil(self.registration.showNotification(notifTitle, defaultOptions));
    return;
  }

  // General Notification Types
  if (
    type === 'SHOW_TOP5_TREND_NOTIFICATION' ||
    type === 'SHOW_JACKPOT_NOTIFICATION' ||
    type === 'SHOW_PRIZE_TIER_NOTIFICATION' ||
    type === 'SHOW_NOTIFICATION'
  ) {
    event.waitUntil(self.registration.showNotification(title, options));
  }
});

// Notification Click: Focus window or open /#jogos / /#estatisticas to inspect results
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'fechar') {
    return;
  }

  const targetTab = event.notification.data?.tab || 'jogos';
  const targetUrl = event.notification.data?.url || (targetTab === 'estatisticas' ? '/#estatisticas' : '/#jogos');

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          client.postMessage({
            type:
              event.notification.data?.type ||
              (targetTab === 'estatisticas'
                ? 'NOTIFICATION_TOP5_TREND_CLICKED'
                : 'NOTIFICATION_SAVED_GAMES_CLICKED'),
            concurso: event.notification.data?.concurso,
            maxHits: event.notification.data?.maxHits,
            dezena: event.notification.data?.dezena,
            marco: event.notification.data?.marco,
            tab: targetTab,
            section: event.notification.data?.section || 'fechamentos_salvos',
          });
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

// Push event fallback for Web Push
self.addEventListener('push', (event) => {
  if (!event.data) return;
  try {
    const payload = event.data.json();
    const title = payload.title || 'LotoSniper • Auditoria de Jogos Salvos';
    const options = {
      body: payload.body || 'Novo sorteio apurado pela Caixa. Seus jogos foram auditados.',
      icon: '/favicon.svg',
      badge: '/favicon.svg',
      data: payload.data || { url: '/#jogos', tab: 'jogos' },
      vibrate: [300, 100, 300, 100, 300],
      renotify: true,
      requireInteraction: true,
      actions: [
        { action: 'conferir', title: '🎯 Conferir Jogos' },
        { action: 'fechar', title: 'Fechar' }
      ]
    };
    event.waitUntil(self.registration.showNotification(title, options));
  } catch {
    const text = event.data.text();
    event.waitUntil(
      self.registration.showNotification('LotoSniper • Auditoria', {
        body: text,
        icon: '/favicon.svg',
        data: { url: '/#jogos', tab: 'jogos' },
      })
    );
  }
});
