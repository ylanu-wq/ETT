/* ============================================================
 * sw.js — Service Worker для ETT (English Today and Tomorrow)
 * Обеспечивает офлайн-работу приложения.
 *
 * Стратегия:
 *  - cache-first для статических файлов (index.html, style.css, script.js, data.js, manifest.json, иконки)
 *  - network-first для запросов к Unsplash API (с fallback на кэш)
 *  - stale-while-revalidate для изображений Unsplash
 * ============================================================ */

const CACHE_VERSION = 'ett-v9-final';
const STATIC_CACHE = `ett-static-${CACHE_VERSION}`;
const IMG_CACHE = `ett-img-${CACHE_VERSION}`;

// Список файлов для пред-кэширования
const STATIC_ASSETS = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './data.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png',
  // Google Fonts (только CSS, сами шрифты кэшируются отдельно браузером)
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap'
];

/* ============================================================
 * install — пред-кэширование статических ресурсов
 * ============================================================ */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => cache.addAll(STATIC_ASSETS).catch(err => {
        // Если какой-то файл не загрузился — не падаем, просто логируем
        console.warn('[SW] Cache addAll partial fail:', err);
      }))
      .then(() => self.skipWaiting())
  );
});

/* ============================================================
 * activate — очистка старых кэшей
 * ============================================================ */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(k => k !== STATIC_CACHE && k !== IMG_CACHE)
          .map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

/* ============================================================
 * fetch — маршрутизация запросов
 * ============================================================ */
self.addEventListener('fetch', event => {
  const req = event.request;
  const url = new URL(req.url);

  // Игнорируем не-GET запросы
  if (req.method !== 'GET') return;

  // Только same-origin и unsplash (images) — остальное в сеть
  const isSameOrigin = url.origin === self.location.origin;
  const isUnsplashImg = url.hostname === 'images.unsplash.com';
  const isUnsplashApi = url.hostname === 'api.unsplash.com';
  const isGoogleFonts = url.hostname.endsWith('googleapis.com') ||
                        url.hostname.endsWith('gstatic.com');

  // 1. Статические файлы — cache-first
  if (isSameOrigin) {
    event.respondWith(
      caches.match(req).then(cached => {
        return cached || fetch(req).then(resp => {
          // Кэшируем свежий ответ
          if (resp.ok) {
            const clone = resp.clone();
            caches.open(STATIC_CACHE).then(c => c.put(req, clone));
          }
          return resp;
        }).catch(() => cached || new Response('Offline', { status: 503 }));
      })
    );
    return;
  }

  // 2. Картинки Unsplash — stale-while-revalidate
  if (isUnsplashImg) {
    event.respondWith(
      caches.open(IMG_CACHE).then(cache =>
        cache.match(req).then(cached => {
          const fetchPromise = fetch(req).then(resp => {
            if (resp.ok) cache.put(req, resp.clone());
            return resp;
          }).catch(() => cached);
          return cached || fetchPromise;
        })
      )
    );
    return;
  }

  // 3. Google Fonts — cache-first с network fallback
  if (isGoogleFonts) {
    event.respondWith(
      caches.match(req).then(cached => cached || fetch(req).then(resp => {
        if (resp.ok) {
          const clone = resp.clone();
          caches.open(STATIC_CACHE).then(c => c.put(req, clone));
        }
        return resp;
      }))
    );
    return;
  }

  // 4. Unsplash API — только сеть (результаты поиска не кэшируем,
  //    они зависят от запроса и могут устаревать)
  if (isUnsplashApi) {
    event.respondWith(fetch(req));
    return;
  }

  // 5. Остальные запросы (импорт по ссылке и т.п.) — только сеть
  event.respondWith(fetch(req));
});

/* ============================================================
 * message — обработка команд от страницы
 * ============================================================ */
self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
