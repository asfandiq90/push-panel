import Link from "next/link";
import { notFound } from "next/navigation";
import { getCampaign } from "@/lib/campaigns";
import { NotificationPreview } from "@/components/notification-preview";

export const dynamic = "force-dynamic";

function Stat({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6">
      <p className="text-sm text-zinc-500">{label}</p>
      <p className={`mt-2 text-3xl font-semibold tabular-nums ${accent ?? ""}`}>{value.toLocaleString()}</p>
    </div>
  );
}

export default async function CampaignResult({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const c = getCampaign(Number(id));
  if (!c) notFound();

  const totalClicks = c.clicks + c.action1_clicks + c.action2_clicks;
  const ctr = c.total_sent > 0 ? ((totalClicks / c.total_sent) * 100).toFixed(1) : "0.0";

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link href="/dashboard/campaigns" className="text-sm text-indigo-600 hover:underline">
          ← Campaigns
        </Link>
        <div className="mt-2 flex items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">Campaign #{c.id}</h1>
          <span className="text-xs uppercase px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800">
            {c.status}
          </span>
        </div>
        <p className="text-sm text-zinc-500 mt-1">
          {c.sent_at
            ? `Sent ${new Date(c.sent_at * 1000).toLocaleString()}`
            : c.scheduled_at
              ? `Scheduled for ${new Date(c.scheduled_at * 1000).toLocaleString()}`
              : `Created ${new Date(c.created_at * 1000).toLocaleString()}`}
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Targeted" value={c.total_targeted} />
        <Stat label="Delivered" value={c.total_sent} accent="text-emerald-600" />
        <Stat label="Total clicks" value={totalClicks} />
        <Stat label="CTR" value={Number(ctr)} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Stat label="Body clicks" value={c.clicks} />
        <Stat label="Button 1 clicks" value={c.action1_clicks} />
        <Stat label="Button 2 clicks" value={c.action2_clicks} />
      </div>

      {(c.total_failed > 0 || c.total_cleaned > 0) && (
        <p className="text-sm text-zinc-500">
          {c.total_failed} failed · {c.total_cleaned} stale subscribers cleaned up.
        </p>
      )}

      <section>
        <p className="text-xs uppercase tracking-widest text-zinc-500 mb-3">Notification</p>
        <NotificationPreview
          title={c.title}
          body={c.body ?? ""}
          icon={c.icon ?? ""}
          image={c.image ?? ""}
          source=""
          action1={c.action1_title ?? undefined}
          action2={c.action2_title ?? undefined}
        />
      </section>
    </div>
  );
}
