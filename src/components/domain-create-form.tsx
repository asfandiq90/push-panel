"use client";

import { useState } from "react";

export function DomainCreateForm() {
  const [label, setLabel] = useState("");
  const [origin, setOrigin] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/domains", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label, origin }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? `Failed (${res.status})`);
        return;
      }
      window.location.href = `/dashboard/domains/${json.id}`;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  const inputCls =
    "h-11 px-4 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-transparent focus:outline-none focus:border-indigo-500";

  return (
    <form onSubmit={onSubmit} className="flex flex-col sm:flex-row gap-3 sm:items-end">
      <label className="flex flex-col gap-1 flex-1">
        <span className="text-sm text-zinc-500">Label</span>
        <input
          required
          placeholder="My blog"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          className={inputCls}
        />
      </label>
      <label className="flex flex-col gap-1 flex-1">
        <span className="text-sm text-zinc-500">Site origin</span>
        <input
          required
          type="url"
          placeholder="https://myblog.com"
          value={origin}
          onChange={(e) => setOrigin(e.target.value)}
          className={inputCls}
        />
      </label>
      <button
        type="submit"
        disabled={busy || !label || !origin}
        className="h-11 px-5 rounded-full font-medium bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
      >
        {busy ? "Creating…" : "Add domain"}
      </button>
      {error && <p className="text-sm text-red-600 dark:text-red-400 w-full">{error}</p>}
    </form>
  );
}
