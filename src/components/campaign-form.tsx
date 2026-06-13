"use client";

import { useEffect, useMemo, useState } from "react";
import { NotificationPreview } from "@/components/notification-preview";

type DomainOpt = { id: number; label: string; origin: string };
type TemplateOpt = {
  id: number;
  name: string;
  title: string | null;
  body: string | null;
  icon: string | null;
  image: string | null;
  url: string | null;
  action1_title: string | null;
  action1_url: string | null;
  action2_title: string | null;
  action2_url: string | null;
};

export function CampaignForm({
  domains,
  templates,
}: {
  domains: DomainOpt[];
  templates: TemplateOpt[];
}) {
  const [fetchUrl, setFetchUrl] = useState("");
  const [fetching, setFetching] = useState(false);
  const [fetchError, setFetchError] = useState("");

  const [domainId, setDomainId] = useState<string>("all");
  const [browser, setBrowser] = useState("");
  const [os, setOs] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [icon, setIcon] = useState("");
  const [image, setImage] = useState("");
  const [url, setUrl] = useState("");
  const [a1Title, setA1Title] = useState("");
  const [a1Url, setA1Url] = useState("");
  const [a2Title, setA2Title] = useState("");
  const [a2Url, setA2Url] = useState("");

  const [sendNow, setSendNow] = useState(true);
  const [scheduledAt, setScheduledAt] = useState("");

  const [facets, setFacets] = useState<{ browsers: string[]; oses: string[] }>({ browsers: [], oses: [] });
  const [audienceCount, setAudienceCount] = useState<number | null>(null);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ id: number; scheduled: boolean; result?: { total: number; sent: number; cleaned: number; failed: number } } | null>(null);

  const previewSource = useMemo(() => {
    if (domainId === "all") return domains[0]?.origin?.replace(/^https?:\/\//, "") ?? "yoursite.com";
    const d = domains.find((x) => String(x.id) === domainId);
    return d ? d.origin.replace(/^https?:\/\//, "") : "yoursite.com";
  }, [domainId, domains]);

  // Live audience count whenever the segment changes.
  useEffect(() => {
    const p = new URLSearchParams();
    if (domainId !== "all") p.set("domainId", domainId);
    if (browser) p.set("browser", browser);
    if (os) p.set("os", os);
    let cancelled = false;
    fetch(`/api/audience?${p.toString()}`)
      .then((r) => r.json())
      .then((j) => {
        if (cancelled) return;
        setAudienceCount(j.count ?? null);
        if (j.facets) setFacets(j.facets);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [domainId, browser, os]);

  function loadTemplate(idStr: string) {
    const t = templates.find((x) => String(x.id) === idStr);
    if (!t) return;
    setTitle(t.title ?? "");
    setBody(t.body ?? "");
    setIcon(t.icon ?? "");
    setImage(t.image ?? "");
    setUrl(t.url ?? "");
    setA1Title(t.action1_title ?? "");
    setA1Url(t.action1_url ?? "");
    setA2Title(t.action2_title ?? "");
    setA2Url(t.action2_url ?? "");
  }

  async function onFetch() {
    if (!fetchUrl) return;
    setFetching(true);
    setFetchError("");
    try {
      const res = await fetch(`/api/fetch-content?url=${encodeURIComponent(fetchUrl)}`);
      const json = await res.json();
      if (!res.ok) {
        setFetchError(json.error ?? `Failed (${res.status})`);
        return;
      }
      if (json.title) setTitle(json.title);
      if (json.description) setBody(json.description);
      if (json.image) setImage(json.image);
      if (json.url) setUrl(json.url);
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : String(err));
    } finally {
      setFetching(false);
    }
  }

  async function saveTemplate() {
    const name = window.prompt("Template name?");
    if (!name) return;
    await fetch("/api/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        title,
        body,
        icon,
        image,
        url,
        action1Title: a1Title,
        action1Url: a1Url,
        action2Title: a2Title,
        action2Url: a2Url,
      }),
    });
    window.alert("Template saved.");
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setResult(null);
    setBusy(true);
    try {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          domainId: domainId === "all" ? null : Number(domainId),
          browser: browser || undefined,
          os: os || undefined,
          title,
          body: body || undefined,
          icon: icon || undefined,
          image: image || undefined,
          url: url || undefined,
          action1Title: a1Title || undefined,
          action1Url: a1Url || undefined,
          action2Title: a2Title || undefined,
          action2Url: a2Url || undefined,
          sendNow,
          scheduledAt: sendNow ? null : scheduledAt,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? `Failed (${res.status})`);
        return;
      }
      setResult(json);
      if (json.id && !json.scheduled) {
        setTimeout(() => (window.location.href = `/dashboard/campaigns/${json.id}`), 1200);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  const inputCls =
    "h-11 px-4 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-transparent focus:outline-none focus:border-indigo-500 w-full";
  const fieldLabel = "text-sm text-zinc-500";

  return (
    <form onSubmit={onSubmit} className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8">
      <div className="flex flex-col gap-6">
        {/* Fetch content */}
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6 flex flex-col gap-3">
          <p className="text-xs uppercase tracking-widest text-zinc-500">Enter URL to fetch content</p>
          <div className="flex gap-2">
            <input
              type="url"
              placeholder="https://yourblog.com/new-article"
              value={fetchUrl}
              onChange={(e) => setFetchUrl(e.target.value)}
              className={inputCls}
            />
            <button
              type="button"
              onClick={onFetch}
              disabled={fetching || !fetchUrl}
              className="shrink-0 h-11 px-5 rounded-lg font-medium bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {fetching ? "Fetching…" : "Fetch Content"}
            </button>
          </div>
          {fetchError && <p className="text-sm text-red-600">{fetchError}</p>}
        </div>

        {/* Template + segmentation */}
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6 flex flex-col gap-4">
          {templates.length > 0 && (
            <label className="flex flex-col gap-1">
              <span className={fieldLabel}>Load template</span>
              <select defaultValue="" onChange={(e) => loadTemplate(e.target.value)} className={inputCls}>
                <option value="">— choose a saved template —</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <label className="flex flex-col gap-1">
              <span className={fieldLabel}>Domain</span>
              <select value={domainId} onChange={(e) => setDomainId(e.target.value)} className={inputCls}>
                <option value="all">All domains</option>
                {domains.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className={fieldLabel}>Browser</span>
              <select value={browser} onChange={(e) => setBrowser(e.target.value)} className={inputCls}>
                <option value="">Any</option>
                {facets.browsers.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className={fieldLabel}>OS</span>
              <select value={os} onChange={(e) => setOs(e.target.value)} className={inputCls}>
                <option value="">Any</option>
                {facets.oses.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <p className="text-sm text-zinc-500">
            This segment matches{" "}
            <span className="font-semibold text-indigo-600">
              {audienceCount == null ? "…" : audienceCount.toLocaleString()}
            </span>{" "}
            subscriber{audienceCount === 1 ? "" : "s"}.
          </p>
        </div>

        {/* Notification fields */}
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6 flex flex-col gap-4">
          <label className="flex flex-col gap-1">
            <span className={fieldLabel}>Title (required)</span>
            <input required maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} />
          </label>

          <label className="flex flex-col gap-1">
            <span className={fieldLabel}>Message</span>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={3}
              maxLength={500}
              className="px-4 py-3 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-transparent focus:outline-none focus:border-indigo-500"
            />
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="flex flex-col gap-1">
              <span className={fieldLabel}>Icon URL</span>
              <input type="url" value={icon} onChange={(e) => setIcon(e.target.value)} className={inputCls} />
            </label>
            <label className="flex flex-col gap-1">
              <span className={fieldLabel}>Image URL (big banner)</span>
              <input type="url" value={image} onChange={(e) => setImage(e.target.value)} className={inputCls} />
            </label>
          </div>

          <label className="flex flex-col gap-1">
            <span className={fieldLabel}>Launch URL (opens on click)</span>
            <input type="url" value={url} onChange={(e) => setUrl(e.target.value)} className={inputCls} />
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <span className={fieldLabel}>Button 1</span>
              <input placeholder="Label" value={a1Title} onChange={(e) => setA1Title(e.target.value)} className={inputCls} />
              <input type="url" placeholder="https://…" value={a1Url} onChange={(e) => setA1Url(e.target.value)} className={inputCls} />
            </div>
            <div className="flex flex-col gap-2">
              <span className={fieldLabel}>Button 2</span>
              <input placeholder="Label" value={a2Title} onChange={(e) => setA2Title(e.target.value)} className={inputCls} />
              <input type="url" placeholder="https://…" value={a2Url} onChange={(e) => setA2Url(e.target.value)} className={inputCls} />
            </div>
          </div>

          <div className="flex flex-col gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
            <span className={fieldLabel}>Send notification now?</span>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input type="radio" checked={sendNow} onChange={() => setSendNow(true)} /> Yes
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="radio" checked={!sendNow} onChange={() => setSendNow(false)} /> No, schedule
              </label>
            </div>
            {!sendNow && (
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                className={inputCls}
              />
            )}
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={busy || !title || (!sendNow && !scheduledAt)}
              className="h-11 px-5 rounded-full font-medium bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {busy ? "Working…" : sendNow ? "Send now" : "Schedule"}
            </button>
            <button
              type="button"
              onClick={saveTemplate}
              disabled={!title}
              className="h-11 px-5 rounded-full font-medium border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-900 disabled:opacity-50"
            >
              Save as template
            </button>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
          {result && result.scheduled && (
            <p className="text-sm text-emerald-600">Scheduled ✓ — campaign #{result.id} will fire at the chosen time.</p>
          )}
          {result && !result.scheduled && result.result && (
            <p className="text-sm text-emerald-600">
              Sent ✓ — {result.result.sent}/{result.result.total} delivered
              {result.result.cleaned ? `, ${result.result.cleaned} stale removed` : ""}. Opening results…
            </p>
          )}
        </div>
      </div>

      <div className="lg:sticky lg:top-10 self-start">
        <p className="text-xs uppercase tracking-widest text-zinc-500 mb-3">Preview</p>
        <NotificationPreview
          title={title}
          body={body}
          icon={icon}
          image={image}
          source={previewSource}
          action1={a1Title}
          action2={a2Title}
        />
      </div>
    </form>
  );
}
