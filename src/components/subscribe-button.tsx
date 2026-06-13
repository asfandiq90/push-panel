"use client";

import { useEffect, useState } from "react";

type Status = "loading" | "unsupported" | "subscribed" | "denied" | "idle" | "error";

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const buffer = new ArrayBuffer(raw.length);
  const out = new Uint8Array(buffer);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export function SubscribeButton({ vapidKey }: { vapidKey: string }) {
  const [status, setStatus] = useState<Status>("loading");
  const [message, setMessage] = useState<string>("");

  async function refresh() {
    if (typeof window === "undefined") return;
    if (!isPushSupported()) {
      setStatus("unsupported");
      return;
    }
    if (Notification.permission === "denied") {
      setStatus("denied");
      return;
    }
    try {
      const reg = await navigator.serviceWorker.getRegistration("/sw.js");
      if (!reg) {
        setStatus("idle");
        return;
      }
      const sub = await reg.pushManager.getSubscription();
      setStatus(sub ? "subscribed" : "idle");
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : String(err));
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function onSubscribe() {
    try {
      setMessage("");
      if (!isPushSupported()) throw new Error("Push not supported in this browser.");
      if (!vapidKey) throw new Error("VAPID public key is missing on the server.");

      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;

      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        throw new Error("Permission was not granted (" + permission + ").");
      }

      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey),
        });
      }

      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscription: sub.toJSON(),
          siteOrigin: window.location.origin,
          userAgent: navigator.userAgent,
        }),
      });
      if (!res.ok) throw new Error("Subscribe API failed: " + res.status);
      await refresh();
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : String(err));
    }
  }

  async function onUnsubscribe() {
    try {
      setMessage("");
      const reg = await navigator.serviceWorker.getRegistration("/sw.js");
      const sub = reg ? await reg.pushManager.getSubscription() : null;
      if (sub) {
        await fetch("/api/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      await refresh();
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : String(err));
    }
  }

  const baseBtn =
    "h-11 px-5 rounded-full font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

  return (
    <div className="flex flex-col gap-3">
      {status === "loading" && (
        <button className={`${baseBtn} bg-zinc-200 text-zinc-500 dark:bg-zinc-800`} disabled>
          Checking…
        </button>
      )}
      {status === "unsupported" && (
        <button className={`${baseBtn} bg-zinc-200 text-zinc-500 dark:bg-zinc-800`} disabled>
          Push not supported in this browser
        </button>
      )}
      {status === "denied" && (
        <button className={`${baseBtn} bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300`} disabled>
          Notifications blocked in browser settings
        </button>
      )}
      {status === "idle" && (
        <button
          className={`${baseBtn} bg-foreground text-background hover:opacity-90`}
          onClick={onSubscribe}
        >
          Enable notifications
        </button>
      )}
      {status === "subscribed" && (
        <button
          className={`${baseBtn} bg-emerald-600 text-white hover:bg-emerald-700`}
          onClick={onUnsubscribe}
        >
          Subscribed — click to unsubscribe
        </button>
      )}
      {status === "error" && (
        <>
          <button
            className={`${baseBtn} bg-foreground text-background hover:opacity-90`}
            onClick={onSubscribe}
          >
            Try again
          </button>
          {message && <p className="text-sm text-red-600 dark:text-red-400">{message}</p>}
        </>
      )}
    </div>
  );
}
