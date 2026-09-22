// Tăng số này (v4 -> v5 -> ...) MỖI LẦN bạn deploy có đổi bất kỳ
// file nào trong ASSETS_TO_CACHE (đặc biệt app.js/store.js/session-domain.mjs).
// Đây là cách duy nhất để buộc trình duyệt của người dùng cũ dọn
// cache cũ và tải bản mới — nếu quên tăng số này, code mới sẽ không
// bao giờ tới tay người dùng dù Netlify đã deploy thành công.
const CACHE_NAME = 'somali-cache-v4';

// Các file "core" (HTML/manifest/icon): cache-first, ít đổi, ưu tiên
// tốc độ + chạy offline được.
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './assets/logo.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
];

// Các file code hay thay đổi theo tính năng mới: luôn ưu tiên lấy
// bản mới nhất từ mạng trước, chỉ dùng cache khi mất mạng.
const NETWORK_FIRST_ASSETS = [
  './css/style.css',
  './js/store.js',
  './js/app.js',
  './js/config.js',
  './js/mascots.js',
  './js/session-domain.mjs',
];

const ASSETS_TO_CACHE = [...CORE_ASSETS, ...NETWORK_FIRST_ASSETS];

function isNetworkFirst(url) {
  return NETWORK_FIRST_ASSETS.some((path) => url.endsWith(path.replace('./', '/')));
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  // Network-first: file code — luôn thử lấy bản mới nhất trước,
  // chỉ rơi về cache khi offline. Nhờ vậy tính năng mới hiện ra
  // ngay lần mở app kế tiếp có mạng, không cần đợi người dùng
  // xóa cache thủ công.
  if (isNetworkFirst(url.pathname)) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Cache-first: file tĩnh ít đổi — ưu tiên tốc độ/offline.
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match('./index.html'));
    })
  );
});

/* ===== Thông báo đẩy (hoạt động cả khi app đã đóng) ===== */
self.addEventListener('push', (event) => {
  let payload = { title: 'Somali', body: 'Sắp đến buổi học' };
  try {
    if (event.data) payload = event.data.json();
  } catch (e) {
    /* giữ payload mặc định nếu dữ liệu không đúng định dạng JSON */
  }

  event.waitUntil(
    self.registration.showNotification(payload.title || 'Somali', {
      body: payload.body || '',
      icon: './icons/icon-192.png',
      badge: './icons/icon-192.png',
      tag: payload.tag || 'somali-reminder',
      data: { url: payload.url || './index.html' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data && event.notification.data.url ? event.notification.data.url : './index.html';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientsArr) => {
      for (const client of clientsArr) {
        if (client.url.includes(self.registration.scope) && 'focus' in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
    })
  );
});
