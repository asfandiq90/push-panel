/* push-panel service worker */

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { title: "Notification", body: event.data ? event.data.text() : "" };
  }

  const title = payload.title || "Notification";
  const options = {
    body: payload.body || "",
    icon: payload.icon || "/icon-192.png",
    badge: payload.badge || "/icon-192.png",
    image: payload.image,
    tag: payload.tag,
    actions: Array.isArray(payload.actions) ? payload.actions : undefined,
    data: {
      url: payload.url || "/",
      a1: payload.a1 || null,
      a2: payload.a2 || null,
    },
    requireInteraction: !!payload.requireInteraction,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  let targetUrl = data.url || "/";
  if (event.action === "a1" && data.a1) targetUrl = data.a1;
  else if (event.action === "a2" && data.a2) targetUrl = data.a2;

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === targetUrl && "focus" in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
    })
  );
});

self.addEventListener("pushsubscriptionchange", (event) => {
  event.waitUntil(
    (async () => {
      try {
        const oldEndpoint = event.oldSubscription ? event.oldSubscription.endpoint : null;
        const sub = await self.registration.pushManager.subscribe(
          event.oldSubscription ? event.oldSubscription.options : { userVisibleOnly: true }
        );
        await fetch("/api/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            oldEndpoint,
            subscription: sub.toJSON(),
            siteOrigin: self.location.origin,
            userAgent: "service-worker",
          }),
        });
      } catch (err) {
        // best-effort; nothing else to do from inside the SW
      }
    })()
  );
});
