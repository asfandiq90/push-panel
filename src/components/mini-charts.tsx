import type { DayPoint } from "@/lib/stats";

export function BarChart({ data }: { data: DayPoint[] }) {
  const max = Math.max(1, ...data.map((d) => d.subscribed));
  const w = 720;
  const h = 160;
  const pad = 20;
  const bw = (w - pad * 2) / data.length;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-40">
      {data.map((d, i) => {
        const bh = ((h - pad * 2) * d.subscribed) / max;
        const x = pad + i * bw;
        const y = h - pad - bh;
        return (
          <g key={d.day}>
            <rect
              x={x + 1}
              y={y}
              width={Math.max(1, bw - 2)}
              height={bh}
              rx={2}
              className="fill-indigo-500"
            >
              <title>{`${d.day}: +${d.subscribed} subscribed, -${d.unsubscribed} unsubscribed`}</title>
            </rect>
          </g>
        );
      })}
      <line x1={pad} y1={h - pad} x2={w - pad} y2={h - pad} className="stroke-zinc-300 dark:stroke-zinc-700" strokeWidth={1} />
    </svg>
  );
}

export function BreakdownBars({ rows }: { rows: { label: string; n: number }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.n));
  if (rows.length === 0) return <p className="text-sm text-zinc-500">No data yet.</p>;
  return (
    <ul className="space-y-2">
      {rows.map((r) => (
        <li key={r.label} className="flex items-center gap-3 text-sm">
          <span className="w-24 shrink-0 truncate">{r.label}</span>
          <div className="flex-1 h-3 rounded bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
            <div
              className="h-full bg-indigo-500"
              style={{ width: `${(r.n / max) * 100}%` }}
            />
          </div>
          <span className="w-10 text-right tabular-nums text-zinc-500">{r.n}</span>
        </li>
      ))}
    </ul>
  );
}
