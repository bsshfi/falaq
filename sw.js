/* فَلَق — يعمل بدون إنترنت. غيّر رقم الإصدار مع كل تحديث */
const VERSION = 'falaq-1.9';
const SHELL = ['./', 'index.html', 'app.js', 'astro.js', 'i18n.js', 'azkar.js', 'wamd-push.js', 'wamd-stats.js', 'manifest.webmanifest',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png', 'icons/icon-maskable-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL.map(u => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION && k !== 'falaq-fonts').map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  // الخطوط: من الذاكرة أولاً ثم تُحدَّث في الخلفية
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(caches.open('falaq-fonts').then(c => c.match(e.request).then(hit => {
      const net = fetch(e.request).then(r => { c.put(e.request, r.clone()); return r; }).catch(() => hit);
      return hit || net;
    })));
    return;
  }
  if (url.origin !== location.origin) return;
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(hit => hit || fetch(e.request).then(r => {
    if (r.ok) { const copy = r.clone(); caches.open(VERSION).then(c => c.put(e.request, copy)); }
    return r;
  }).catch(() => caches.match('index.html'))));
});

/* الإشعارات: الأذان والأخبار والمعايدات (بنغمة الجوال الافتراضية) */
self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (err) { d = { body: e.data ? e.data.text() : '' }; }
  const ar = d.lang !== 'en';
  e.waitUntil(self.registration.showNotification(d.title || (ar ? 'فَلَق' : 'Falaq'), {
    body: d.body || '', tag: d.tag || 'falaq', lang: ar ? 'ar' : 'en', dir: ar ? 'rtl' : 'ltr',
    icon: 'icons/icon-192.png', badge: 'icons/icon-192.png', data: { url: d.url || './' }
  }));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || './';
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    for (const c of list) if ('focus' in c) { if (url !== './' && 'navigate' in c) c.navigate(url); return c.focus(); }
    return self.clients.openWindow(url);
  }));
});
