self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("push", (e) => {
  const d = e.data ? e.data.json() : {};
  e.waitUntil((async () => {
    await self.registration.showNotification(d.title || "ITACHI PERÚ", {
      body: d.body || "", icon: d.icon || "/icon-192.png", badge: "/icon-192.png",
      vibrate: [120, 60, 120, 60, 320], tag: d.tag || "itachi", renotify: true, data: { url: d.url || "/" }
    });
    const cs = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    cs.forEach((c) => c.postMessage({ type: "push", title: d.title, body: d.body }));
  })());
});
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = e.notification.data.url;
  e.waitUntil((async () => {
    const cs = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const hit = cs.find((c) => c.url.includes(url));
    return hit ? hit.focus() : self.clients.openWindow(url);
  })());
});
