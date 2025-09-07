const CACHE = 'recipepad-v1';
const RECIPES_URL = '/recipes'; // относительный путь за счёт того, что фронт ходит на один домен через прокси? 
// если зовёшь абсолютный API, укажи полный: 'https://recipepad-api.onrender.com/recipes'

self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = event.request.url;
  if (url.includes(RECIPES_URL)) {
    event.respondWith(staleWhileRevalidate(event.request));
  }
});

async function staleWhileRevalidate(req) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(req);
  const networkPromise = fetch(req)
    .then((res) => {
      if (res && res.ok) cache.put(req, res.clone());
      return res;
    })
    .catch(() => cached); // если сеть упала — отдадим кэш

  // отдать кэш мгновенно, а обновление прилетит потом
  return cached || networkPromise;
}
