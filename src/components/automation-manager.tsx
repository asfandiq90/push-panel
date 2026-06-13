"use client";

import { useState } from "react";

type Feed = {
  id: number;
  url: string;
  domain_id: number | null;
  enabled: number;
  interval_min: number;
  last_status: string | null;
  last_checked: number | null;
};
type DomainOpt = { id: number; label: string };

export function AutomationManager({
  initial,
  domains,
}: {
  initial: Feed[];
  domains: DomainOpt[];
}) {
  const [feeds, setFeeds] = useState(initial);
  const [url, setUrl] = useState("");
  const [domainId, setDomainId] = useState("all");
  const [interval, setInterval] = useState("15");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");

  async function refresh() {
    const r = await fetch("/api/feeds");
    const j = await r.json();
    setFeeds(j.feeds ?? []);
  }

  async function add(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/feeds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url,
          domainId: domainId === "all" ? null : Number(domainId),
          intervalMin: Number(interval),
        }),
      });
      const j = await res.json();
      if (!res.ok) {
        setError(j.error ?? `Failed (${res.status})`);
        return;
      }
      setUrl("");
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function action(id: number, act: "check" | "toggle") {
    setNote("");
    const res = await fetch("/api/feeds", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: act, id }),
    });
    const j = await res.json();
    if (act === "check") {
      setNote(j.pushed ? "New post found and pushed ✓" : j.error ? `No push: ${j.error}` : "No new post.");
    }
    await refresh();
  }

  async function remove(id: number) {
    if (!window.confirm("Delete this feed?")) return;
    await fetch(`/api/feeds?id=${id}`, { method: "DELETE" });
    await refresh();
  }

  const inputCls =
    "h-11 px-4 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-transparent focus:outline-none focus:border-indigo-500";

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6">
        <h2 className="font-medium mb-1">Auto-push on new posts</h2>
        <p className="text-sm text-zinc-500 mb-4">
          Add an RSS/Atom feed. The panel checks it on a schedule and automatically sends a
          notification whenever a new post appears (title, summary &amp; image pulled from the feed).
        </p>
        <form onSubmit={add} className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto_auto] gap-3 sm:items-end">
          <label className="flex flex-col gap-1">
            <span className="text-sm text-zinc-500">Feed URL</span>
            <input
              required
              type="url"
              placeholder="https://yourblog.com/feed"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className={inputCls}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm text-zinc-500">Domain</span>
            <select value={domainId} onChange={(e) => setDomainId(e.target.value)} className={inputCls}>
              <option value="all">All</option>
              {domains.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm text-zinc-500">Every (min)</span>
            <input
              type="number"
              min={5}
              value={interval}
              onChange={(e) => setInterval(e.target.value)}
              className={`${inputCls} w-24`}
            />
          </label>
          <button
            type="submit"
            disabled={busy || !url}
            className="h-11 px-5 rounded-full font-medium bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {busy ? "Adding…" : "Add feed"}
          </button>
        </form>
        {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
        {note && <p className="text-sm text-emerald-600 mt-2">{note}</p>}
      </section>

      <section className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
        {feeds.length === 0 ? (
          <p className="px-6 py-8 text-sm text-zinc-500">No feeds yet.</p>
        ) : (
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {feeds.map((f) => (
              <li key={f.id} className="px-6 py-4 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-mono text-sm truncate">{f.url}</p>
                  <p className="text-xs text-zinc-500">
                    every {f.interval_min}m · {f.last_status ?? "never checked"}
                    {f.last_checked ? ` · ${new Date(f.last_checked * 1000).toLocaleString()}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span
                    className={`text-[10px] uppercase px-1.5 py-0.5 rounded ${
                      f.enabled
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                        : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800"
                    }`}
                  >
                    {f.enabled ? "on" : "off"}
                  </span>
                  <button onClick={() => action(f.id, "check")} className="text-sm text-indigo-600 hover:underline">
                    Check now
                  </button>
                  <button onClick={() => action(f.id, "toggle")} className="text-sm text-zinc-600 hover:underline">
                    {f.enabled ? "Disable" : "Enable"}
                  </button>
                  <button onClick={() => remove(f.id)} className="text-sm text-red-600 hover:underline">
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
