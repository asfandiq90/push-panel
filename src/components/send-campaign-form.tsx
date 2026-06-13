"use client";

import { useState } from "react";

type SendResult = {
  total: number;
  sent: number;
  cleaned: number;
  failed: number;
  errors: { endpoint: string; statusCode?: number; message: string }[];
};

export function SendCampaignForm({ origins }: { origins: string[] }) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [url, setUrl] = useState("");
  const [icon, setIcon] = useState("");
  const [targetOrigin, setTargetOrigin] = useState("*");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<SendResult | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setResult(null);
    setBusy(true);
    try {
      const res = await fetch("/api/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          body: body || undefined,
          url: url || undefined,
          icon: icon || undefined,
          targetOrigin,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? `Send failed (${res.status})`);
        return;
      }
      setResult(json as SendResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  const inputCls =
    "h-11 px-4 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-transparent focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-100";

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6 flex flex-col gap-4"
    >
      <h2 className="text-lg font-medium">Campaign</h2>

      <label className="flex flex-col gap-1">
        <span className="text-sm text-zinc-500">Title (required)</span>
        <input
          required
          maxLength={120}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className={inputCls}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm text-zinc-500">Body</span>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          maxLength={500}
          className="px-4 py-3 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-transparent focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-100"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm text-zinc-500">Click URL (opens when user clicks the notification)</span>
        <input
          type="url"
          placeholder="https://example.com/new-article"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className={inputCls}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm text-zinc-500">Icon URL (optional)</span>
        <input
          type="url"
          placeholder="https://example.com/icon-192.png"
          value={icon}
          onChange={(e) => setIcon(e.target.value)}
          className={inputCls}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm text-zinc-500">Send to</span>
        <select
          value={targetOrigin}
          onChange={(e) => setTargetOrigin(e.target.value)}
          className={inputCls}
        >
          <option value="*">All subscribers</option>
          {origins.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      </label>

      <button
        type="submit"
        disabled={busy || !title}
        className="h-11 px-5 rounded-full font-medium bg-foreground text-background hover:opacity-90 disabled:opacity-50"
      >
        {busy ? "Sending…" : "Send notification"}
      </button>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      {result && (
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4 text-sm flex flex-col gap-1">
          <div>
            <span className="text-zinc-500">Targeted:</span>{" "}
            <span className="tabular-nums font-medium">{result.total}</span>
          </div>
          <div>
            <span className="text-zinc-500">Sent:</span>{" "}
            <span className="tabular-nums font-medium text-emerald-700 dark:text-emerald-400">
              {result.sent}
            </span>
          </div>
          <div>
            <span className="text-zinc-500">Cleaned up (gone):</span>{" "}
            <span className="tabular-nums font-medium">{result.cleaned}</span>
          </div>
          {result.failed > 0 && (
            <div>
              <span className="text-zinc-500">Failed:</span>{" "}
              <span className="tabular-nums font-medium text-red-600 dark:text-red-400">
                {result.failed}
              </span>
            </div>
          )}
          {result.errors.length > 0 && (
            <details className="mt-2">
              <summary className="cursor-pointer text-zinc-500">Error details</summary>
              <ul className="mt-2 text-xs font-mono space-y-1">
                {result.errors.slice(0, 10).map((e, i) => (
                  <li key={i} className="truncate">
                    [{e.statusCode ?? "?"}] {e.message}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
    </form>
  );
}
