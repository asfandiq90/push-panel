import Link from "next/link";
import { listCampaigns } from "@/lib/campaigns";

export const dynamic = "force-dynamic";

const statusColor: Record<string, string> = {
  completed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  sending: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  scheduled: "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300",
  failed: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
  draft: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
};

export default function CampaignsPage() {
  const campaigns = listCampaigns(100);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Campaigns</h1>
        <Link
          href="/dashboard/campaigns/new"
          className="h-10 px-4 inline-flex items-center rounded-full bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700"
        >
          + Create Campaign
        </Link>
      </div>

      <section className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
        {campaigns.length === 0 ? (
          <p className="px-6 py-8 text-sm text-zinc-500">No campaigns yet.</p>
        ) : (
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {campaigns.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/dashboard/campaigns/${c.id}`}
                  className="flex items-center justify-between px-6 py-4 hover:bg-zinc-50 dark:hover:bg-zinc-900 gap-4"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">{c.title}</p>
                      <span className={`text-[10px] uppercase px-1.5 py-0.5 rounded ${statusColor[c.status] ?? statusColor.draft}`}>
                        {c.status}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-500">
                      #{c.id} ·{" "}
                      {c.scheduled_at && c.status === "scheduled"
                        ? `scheduled for ${new Date(c.scheduled_at * 1000).toLocaleString()}`
                        : new Date((c.sent_at ?? c.created_at) * 1000).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right text-sm tabular-nums shrink-0">
                    <span className="text-emerald-600">{c.total_sent}</span>
                    <span className="text-zinc-400"> sent · </span>
                    <span>{c.clicks + c.action1_clicks + c.action2_clicks}</span>
                    <span className="text-zinc-400"> clicks</span>
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
