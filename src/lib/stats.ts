import { getDb } from "@/lib/db";

function today(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
}

export function bumpSubscribed(domainId: number | null) {
  getDb()
    .prepare(
      `INSERT INTO daily_stats (day, domain_id, subscribed, unsubscribed)
       VALUES (?, ?, 1, 0)
       ON CONFLICT(day, domain_id) DO UPDATE SET subscribed = subscribed + 1`
    )
    .run(today(), domainId);
}

export function bumpUnsubscribed(domainId: number | null) {
  getDb()
    .prepare(
      `INSERT INTO daily_stats (day, domain_id, subscribed, unsubscribed)
       VALUES (?, ?, 0, 1)
       ON CONFLICT(day, domain_id) DO UPDATE SET unsubscribed = unsubscribed + 1`
    )
    .run(today(), domainId);
}

export type DayPoint = { day: string; subscribed: number; unsubscribed: number };

/** Subscribed/unsubscribed totals per day for the last N days (zero-filled). */
export function dailySeries(days = 30): DayPoint[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT day, SUM(subscribed) AS subscribed, SUM(unsubscribed) AS unsubscribed
         FROM daily_stats
        GROUP BY day`
    )
    .all() as { day: string; subscribed: number; unsubscribed: number }[];
  const map = new Map(rows.map((r) => [r.day, r]));

  const out: DayPoint[] = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() - i);
    const key = d.toISOString().slice(0, 10);
    const hit = map.get(key);
    out.push({
      day: key,
      subscribed: hit?.subscribed ?? 0,
      unsubscribed: hit?.unsubscribed ?? 0,
    });
  }
  return out;
}

export function breakdown(column: "browser" | "os" | "country"): { label: string; n: number }[] {
  return getDb()
    .prepare(
      `SELECT COALESCE(${column}, 'Unknown') AS label, COUNT(*) AS n
         FROM subscribers
        GROUP BY ${column}
        ORDER BY n DESC`
    )
    .all() as { label: string; n: number }[];
}

export function totals() {
  const db = getDb();
  const subs = (db.prepare("SELECT COUNT(*) AS n FROM subscribers").get() as { n: number }).n;
  const sent = (
    db.prepare("SELECT COALESCE(SUM(total_sent),0) AS n FROM campaigns").get() as { n: number }
  ).n;
  const clicks = (
    db
      .prepare("SELECT COALESCE(SUM(clicks + action1_clicks + action2_clicks),0) AS n FROM campaigns")
      .get() as { n: number }
  ).n;
  const campaigns = (db.prepare("SELECT COUNT(*) AS n FROM campaigns").get() as { n: number }).n;
  return { subs, sent, clicks, campaigns };
}
