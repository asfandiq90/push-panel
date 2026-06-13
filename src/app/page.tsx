import { getDb } from "@/lib/db";
import { SubscribeButton } from "@/components/subscribe-button";

export const dynamic = "force-dynamic";

export default function Home() {
  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

  const db = getDb();
  const total = (db.prepare("SELECT COUNT(*) AS n FROM subscribers").get() as { n: number }).n;
  const byOrigin = db
    .prepare(
      "SELECT site_origin, COUNT(*) AS n FROM subscribers GROUP BY site_origin ORDER BY n DESC LIMIT 10"
    )
    .all() as { site_origin: string | null; n: number }[];

  const installSnippet = `<script src="${vapidPublicKey ? "<YOUR_PANEL_URL>" : ""}/push-widget.js"
        data-vapid-key="${vapidPublicKey || "<VAPID_PUBLIC_KEY>"}"
        data-api-base="<YOUR_PANEL_URL>"
        defer></script>

<button onclick="PushPanel.subscribe()">Enable notifications</button>`;

  return (
    <div className="flex flex-col flex-1 items-center bg-zinc-50 font-sans dark:bg-black">
      <main className="w-full max-w-3xl py-16 px-8 flex flex-col gap-12">
        <header className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-3">
            <p className="text-xs uppercase tracking-widest text-zinc-500">push-panel</p>
            <h1 className="text-4xl font-semibold leading-tight tracking-tight">
              Self-hosted web-push panel
            </h1>
            <p className="text-zinc-600 dark:text-zinc-400 max-w-xl">
              Drop a snippet on any site, collect browser-push subscribers into your own SQLite
              database. No vendor, no monthly fees.
            </p>
          </div>
          <a
            href="/dashboard"
            className="shrink-0 text-sm h-9 px-4 inline-flex items-center rounded-full border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-900"
          >
            Dashboard →
          </a>
        </header>

        <section className="rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 flex flex-col gap-4 bg-white dark:bg-zinc-950">
          <h2 className="text-lg font-medium">Try it on this page</h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            This page already loads <code className="font-mono text-xs">/push-widget.js</code>{" "}
            against this same origin. Subscribing here will write a row into the local SQLite DB.
          </p>
          <SubscribeButton vapidKey={vapidPublicKey} />
        </section>

        <section className="rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 flex flex-col gap-4 bg-white dark:bg-zinc-950">
          <div className="flex items-baseline justify-between">
            <h2 className="text-lg font-medium">Subscribers</h2>
            <span className="text-3xl font-semibold tabular-nums">{total}</span>
          </div>
          {byOrigin.length > 0 ? (
            <ul className="text-sm divide-y divide-zinc-100 dark:divide-zinc-800">
              {byOrigin.map((row) => (
                <li
                  key={row.site_origin ?? "unknown"}
                  className="flex justify-between py-2 font-mono"
                >
                  <span className="truncate">{row.site_origin ?? "(unknown origin)"}</span>
                  <span className="tabular-nums">{row.n}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-zinc-500">No subscribers yet — click the button above.</p>
          )}
        </section>

        <section className="rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 flex flex-col gap-4 bg-white dark:bg-zinc-950">
          <h2 className="text-lg font-medium">Embed on another site</h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            On a different origin you also need to host <code>/sw.js</code> at the root of that
            site (service workers can&apos;t be loaded cross-origin). The widget itself can be
            served from this panel.
          </p>
          <pre className="overflow-x-auto rounded-lg bg-zinc-900 text-zinc-100 p-4 text-xs leading-relaxed">
            <code>{installSnippet}</code>
          </pre>
          <div className="text-xs text-zinc-500">
            VAPID public key:{" "}
            <code className="font-mono break-all">
              {vapidPublicKey || "(not set — check .env.local)"}
            </code>
          </div>
        </section>
      </main>
    </div>
  );
}
