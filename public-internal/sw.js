// Heisenberg Lab service worker. Scope "/". Push notifications and notification taps only:
// no fetch handler and no caching, so the portal always loads live from the network.
self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (e) { e.waitUntil(self.clients.claim()); });

self.addEventListener('push', function (event) {
  var data = {};
  try { data = event.data ? event.data.json() : {}; }
  catch (err) { data = { body: event.data ? event.data.text() : '' }; }
  var url = typeof data.url === 'string' && data.url.charAt(0) === '/' && data.url.charAt(1) !== '/' ? data.url : '/';
  var opts = { icon: '/icon-192.png', badge: '/icon-192.png', tag: data.tag ? String(data.tag).slice(0, 60) : 'portal', data: { url: url } };
  if (data.body) { opts.body = String(data.body).slice(0, 160); }
  event.waitUntil(self.registration.showNotification(String(data.title || 'Heisenberg Lab').slice(0, 60), opts));
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  var url = (event.notification.data && event.notification.data.url) || '/';
  var target = new URL(url, self.location.origin).href;
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (list) {
    for (var i = 0; i < list.length; i++) {
      if (new URL(list[i].url).origin === self.location.origin && 'focus' in list[i]) {
        if ('navigate' in list[i]) { return list[i].navigate(target).then(function (c) { return (c || list[i]).focus(); }).catch(function () { return list[i].focus(); }); }
        return list[i].focus();
      }
    }
    return self.clients.openWindow(target);
  }));
});
