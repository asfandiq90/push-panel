import { getDb } from "@/lib/db";
import { listFeeds } from "@/lib/feeds";
import { statSync } from "node:fs";
import { resolve } from "node:path";

export const dynamic = "force-dynamic";

function dbSizeMB(): string {
  try {
    const p = resolve(process.cwd(), process.env.PUSH_DB_PATH ?? "./data/push-panel.db");
    return (statSync(p).size / (1024 * 1024)).toFixed(2) + " MB";
  } catch {
    return "—";
  }
}

export default function StatusPage() {
  const db = getDb();
  const subs = (db.prepare("SELECT COUNT(*) AS n FROM subscribers").get() as { n: number }).n;
  const domains = (db.prepare("SELECT COUNT(*) AS n FROM domains").get() as { n: number }).n;
  const campaigns = (db.prepare("SELECT COUNT(*) AS n FROM campaigns").get() as { n: number }).n;
  const scheduled = (
    db.prepare("SELECT COUNT(*) AS n FROM campaigns WHERE status = 'scheduled'").get() as { n: number }
  ).n;
  const feeds = listFeeds();
  const activeFeeds = feeds.filter((f) => f.enabled).length;

  const rows: { k: string; v: string }[] = [
    { k: "VAPID configured", v: process.env.VAPID_PRIVATE_KEY ? "Yes" : "No" },
    { k: "Panel base URL", v: process.env.PANEL_BASE_URL ?? "http://localhost:3000" },
    { k: "Database size", v: dbSizeMB() },
    { k: "Subscribers", v: String(subs) },
    { k: "Domains", v: String(domains) },
    { k: "Campaigns (total)", v: String(campaigns) },
    { k: "Campaigns scheduled", v: String(scheduled) },
    { k: "RSS feeds (active / total)", v: `${activeFeeds} / ${feeds.length}` },
    { k: "Scheduler", v: "running (30s interval)" },
    { k: "Node version", v: process.version },
  ];

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-2xl font-semibold tracking-tight">Server Status</h1>
      <section className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 overflow-hidden">
        <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {rows.map((r) => (
            <li key={r.k} className="flex items-center justify-between px-6 py-3 text-sm">
              <span className="text-zinc-500">{r.k}</span>
              <span className="font-mono">{r.v}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
