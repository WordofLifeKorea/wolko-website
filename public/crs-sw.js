// WOLKO CRS Service Worker
// Firebase 인증·데이터는 항상 네트워크에서 가져옴 (캐시 제외)
// 정적 자산(HTML, CSS, JS)은 네트워크 우선 → 실패 시 캐시 폴백

const CACHE_NAME = 'wolko-crs-v1';
const PRECACHE = ['/crs', '/crs-manifest.json'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  const url = e.request.url;

  // Firebase / Google API / 외부 리소스 → SW 처리 안 함 (네트워크 직접)
  if (
    url.includes('firebaseio.com') ||
    url.includes('firebasedatabase.app') ||
    url.includes('googleapis.com') ||
    url.includes('firebaseapp.com') ||
    url.includes('identitytoolkit') ||
    url.includes('/api/')
  ) return;

  // 나머지: 네트워크 우선, 실패 시 캐시 폴백
  e.respondWith(
    fetch(e.request)
      .then(res => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
        }
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});
