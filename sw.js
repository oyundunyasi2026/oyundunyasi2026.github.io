// Keeps the start page and its icons on the device so the app opens without internet.
// The app itself is not cached here: the start page stores it in the device database.
const ON_EK = 'oyun-kabuk-';        // this site shares its web origin with other sites: only caches with this prefix are ours
const AD = ON_EK + '20261006-142619';     // stamped at every publish: a new stamp makes devices take the new start page
const DOSYALAR = ['./', 'index.html', 'manifest.webmanifest', 'ikon-192.png', 'ikon-512.png'];

self.addEventListener('install', e => {
  // 'reload' skips the browser's own 10-minute copy, so the saved start page is really the published one
  e.waitUntil(caches.open(AD).then(c => c.addAll(DOSYALAR.map(d => new Request(d, { cache: 'reload' })))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith(ON_EK) && k !== AD).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;          // Claude API calls and the like go straight out
  if (!u.pathname.startsWith(new URL(self.registration.scope).pathname)) return;   // not this site
  if (/(uygulama\.bin|surum\.json)$/.test(u.pathname)) return;                     // always fresh from the network
  if (e.request.mode === 'navigate') {                                             // the page: newest when online, the saved copy when not
    e.respondWith(fetch(u.origin + u.pathname, { cache: 'no-store' }).then(r => {
      if (r.ok && /\/(index\.html)?$/.test(u.pathname)) { const k = r.clone(); caches.open(AD).then(c => c.put('index.html', k)); }   // only the start page itself is kept
      return r;
    }).catch(() => caches.open(AD).then(c => c.match('index.html'))));
    return;
  }
  e.respondWith(caches.open(AD).then(c => c.match(e.request, { ignoreSearch: true })).then(r => r || fetch(e.request)));
});
