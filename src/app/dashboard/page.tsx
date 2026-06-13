import Link from "next/link";
import { getDb } from "@/lib/db";
import { listCampaigns, listDomains } from "@/lib/campaigns";

export const dynamic = "force-dynamic";

function StatCard({ label, value, href }: { label: string; value: string | number; href?: string }) {
  const inner = (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6">
      <p className="text-sm text-zinc-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold tabular-nums">{value}</p>
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

export default function DashboardHome() {
  const db = getDb();
  const subs = (db.prepare("SELECT COUNT(*) AS n FROM subscribers").get() as { n: number }).n;
  const domains = listDomains();
  const campaigns = listCampaigns(8);
  const totalSent = (
    db.prepare("SELECT COALESCE(SUM(total_sent),0) AS n FROM campaigns").get() as { n: number }
  ).n;
  const totalClicks = (
    db.prepare("SELECT COALESCE(SUM(clicks + action1_clicks + action2_clicks),0) AS n FROM campaigns").get() as {
      n: number;
    }
  ).n;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <Link
          href="/dashboard/campaigns/new"
          className="h-10 px-4 inline-flex items-center rounded-full bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700"
        >
          + Create Campaign
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Subscribers" value={subs} href="/dashboard/domains" />
        <StatCard label="Domains" value={domains.length} href="/dashboard/domains" />
        <StatCard label="Notifications sent" value={totalSent} href="/dashboard/campaigns" />
        <StatCard label="Total clicks" value={totalClicks} href="/dashboard/campaigns" />
      </div>

      <section className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 dark:border-zinc-800">
          <h2 className="font-medium">Recent campaigns</h2>
          <Link href="/dashboard/campaigns" className="text-sm text-indigo-600 hover:underline">
            View all
          </Link>
        </div>
        {campaigns.length === 0 ? (
          <p className="px-6 py-8 text-sm text-zinc-500">
            No campaigns yet.{" "}
            <Link href="/dashboard/campaigns/new" className="text-indigo-600 hover:underline">
              Create your first one →
            </Link>
          </p>
        ) : (
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {campaigns.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/dashboard/campaigns/${c.id}`}
                  className="flex items-center justify-between px-6 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-900"
                >
                  <div className="min-w-0">
                    <p className="font-medium truncate">{c.title}</p>
                    <p className="text-xs text-zinc-500">
                      {c.status} · {new Date(c.created_at * 1000).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right text-sm tabular-nums shrink-0 ml-4">
                    <span className="text-emerald-600">{c.total_sent} sent</span>
                    <span className="text-zinc-400"> · </span>
                    <span>{c.clicks + c.action1_clicks + c.action2_clicks} clicks</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
