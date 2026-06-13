/*
 * push-panel drop-in widget
 *
 * Usage on any site:
 *   <script src="https://your-panel.example/push-widget.js"
 *           data-vapid-key="BPubKeyHere..."
 *           data-api-base="https://your-panel.example"
 *           data-sw-url="/sw.js"
 *           defer></script>
 *
 *   <button onclick="PushPanel.subscribe()">Enable notifications</button>
 *
 * If the panel and the site share an origin, you can omit data-api-base.
 * If data-sw-url is omitted, "/sw.js" is used (so the panel must host it; for
 * cross-origin embedding, the host site must serve its own /sw.js — see README).
 */
(function () {
  "use strict";

  const script = document.currentScript;
  const fromAttrs = script
    ? {
        vapidKey: script.dataset.vapidKey,
        apiBase: script.dataset.apiBase,
        swUrl: script.dataset.swUrl,
        autoPrompt: script.dataset.autoPrompt === "true",
      }
    : null;
  const fromGlobal = window.__PUSH_PANEL_CONFIG__ || null;
  const cfg = {
    vapidKey: (fromAttrs && fromAttrs.vapidKey) || (fromGlobal && fromGlobal.vapidKey) || "",
    apiBase: (fromAttrs && fromAttrs.apiBase) || (fromGlobal && fromGlobal.apiBase) || "",
    swUrl: (fromAttrs && fromAttrs.swUrl) || (fromGlobal && fromGlobal.swUrl) || "/sw.js",
    autoPrompt:
      !!(fromAttrs && fromAttrs.autoPrompt) || !!(fromGlobal && fromGlobal.autoPrompt),
  };

  function urlBase64ToUint8Array(base64String) {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const raw = atob(base64);
    const out = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
    return out;
  }

  function isSupported() {
    return (
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window
    );
  }

  async function getRegistration() {
    return navigator.serviceWorker.register(cfg.swUrl);
  }

  async function getSubscription() {
    if (!isSupported()) return null;
    const reg = await navigator.serviceWorker.ready;
    return reg.pushManager.getSubscription();
  }

  async function subscribe() {
    if (!isSupported()) {
      throw new Error("Push notifications are not supported in this browser.");
    }
    if (!cfg.vapidKey) {
      throw new Error("PushPanel: data-vapid-key is required on the script tag.");
    }

    await getRegistration();
    const reg = await navigator.serviceWorker.ready;

    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      throw new Error("Permission for notifications was not granted (" + permission + ").");
    }

    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(cfg.vapidKey),
      });
    }

    const res = await fetch(cfg.apiBase + "/api/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subscription: sub.toJSON(),
        siteOrigin: window.location.origin,
        userAgent: navigator.userAgent,
      }),
    });

    if (!res.ok) {
      throw new Error("Subscribe API failed: " + res.status);
    }
    return sub;
  }

  async function unsubscribe() {
    const sub = await getSubscription();
    if (!sub) return false;
    await fetch(cfg.apiBase + "/api/unsubscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint: sub.endpoint }),
    });
    await sub.unsubscribe();
    return true;
  }

  async function isSubscribed() {
    const sub = await getSubscription();
    return !!sub;
  }

  window.PushPanel = { subscribe, unsubscribe, isSubscribed, isSupported };

  if (cfg.autoPrompt && isSupported()) {
    getRegistration().catch(() => {});
  }
})();
