import { dailySeries, breakdown, totals } from "@/lib/stats";
import { BarChart, BreakdownBars } from "@/components/mini-charts";

export const dynamic = "force-dynamic";

function Card({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <section className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6">
      <h2 className="font-medium mb-4">{title}</h2>
      {children}
    </section>
  );
}

export default function StatisticsPage() {
  const series = dailySeries(30);
  const t = totals();
  const browsers = breakdown("browser");
  const oses = breakdown("os");
  const last30 = series.reduce((a, d) => a + d.subscribed, 0);

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-2xl font-semibold tracking-tight">Statistics</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total subscribers", value: t.subs },
          { label: "New (30 days)", value: last30 },
          { label: "Notifications sent", value: t.sent },
          { label: "Total clicks", value: t.clicks },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6">
            <p className="text-sm text-zinc-500">{s.label}</p>
            <p className="mt-2 text-3xl font-semibold tabular-nums">{s.value.toLocaleString()}</p>
          </div>
        ))}
      </div>

      <Card title="New subscribers — last 30 days">
        <BarChart data={series} />
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card title="By browser">
          <BreakdownBars rows={browsers} />
        </Card>
        <Card title="By operating system">
          <BreakdownBars rows={oses} />
        </Card>
      </div>
    </div>
  );
}
