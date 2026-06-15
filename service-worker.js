// 우리 아기 나들이 지도 — service worker (오프라인 지원)
const CACHE = 'babymap-v1';
const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // 지도 타일은 캐시하지 않음(용량이 큼) — 네트워크 우선, 실패하면 그냥 실패
  if (url.hostname.endsWith('tile.openstreetmap.org')) return;

  // 같은 출처의 앱 파일: 캐시 우선
  if (url.origin === location.origin) {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
      return res;
    }).catch(() => caches.match('./index.html'))));
    return;
  }

  // 외부 CDN(leaflet, 폰트): stale-while-revalidate
  e.respondWith(caches.match(req).then(hit => {
    const net = fetch(req).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
      return res;
    }).catch(() => hit);
    return hit || net;
  }));
});
