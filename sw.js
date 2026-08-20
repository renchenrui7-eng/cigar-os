/* Cigar OS PWA Service Worker — V2.4
   策略：安装时预缓存应用壳；运行时同源 GET 请求 cache-first（data.js 带版本号指纹失效）
*/
const CACHE = 'cigar-os-v2.4';
const PRECACHE = [
  './',
  './index.html',
  './data.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-192.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
  './icons/favicon.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;          // 只处理同源
  if (url.pathname.endsWith('sw.js')) return;          // SW 自身不走缓存

  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then(hit => {
      if (hit) {
        // 后台静默更新（stale-while-revalidate）
        fetch(req).then(res => {
          if (res && res.ok) caches.open(CACHE).then(c => c.put(req, res.clone()));
        }).catch(() => {});
        return hit;
      }
      return fetch(req).then(res => {
        if (res && res.ok && res.type === 'basic') {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(req, clone));
        }
        return res;
      }).catch(() => caches.match('./index.html'));   // 离线兜底
    })
  );
});
