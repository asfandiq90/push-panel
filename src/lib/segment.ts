import { getDb, type SegmentFilters, type SubscriberRow } from "@/lib/db";

/** Build a SQL WHERE fragment + params from segment filters. */
export function buildWhere(filters: SegmentFilters | null | undefined): {
  where: string;
  params: unknown[];
} {
  const clauses: string[] = [];
  const params: unknown[] = [];
  if (filters?.domainId != null) {
    clauses.push("domain_id = ?");
    params.push(filters.domainId);
  }
  if (filters?.origin) {
    clauses.push("site_origin = ?");
    params.push(filters.origin);
  }
  if (filters?.browser) {
    clauses.push("browser = ?");
    params.push(filters.browser);
  }
  if (filters?.os) {
    clauses.push("os = ?");
    params.push(filters.os);
  }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  return { where, params };
}

export function countAudience(filters: SegmentFilters | null | undefined): number {
  const { where, params } = buildWhere(filters);
  const row = getDb()
    .prepare(`SELECT COUNT(*) AS n FROM subscribers ${where}`)
    .get(...params) as { n: number };
  return row.n;
}

export function selectAudience(filters: SegmentFilters | null | undefined): SubscriberRow[] {
  const { where, params } = buildWhere(filters);
  return getDb()
    .prepare(`SELECT * FROM subscribers ${where}`)
    .all(...params) as SubscriberRow[];
}

/** Distinct values present in the subscriber base, for building segment dropdowns. */
export function facets(): { browsers: string[]; oses: string[] } {
  const db = getDb();
  const browsers = (
    db.prepare("SELECT DISTINCT browser FROM subscribers WHERE browser IS NOT NULL ORDER BY browser").all() as {
      browser: string;
    }[]
  ).map((r) => r.browser);
  const oses = (
    db.prepare("SELECT DISTINCT os FROM subscribers WHERE os IS NOT NULL ORDER BY os").all() as {
      os: string;
    }[]
  ).map((r) => r.os);
  return { browsers, oses };
}
