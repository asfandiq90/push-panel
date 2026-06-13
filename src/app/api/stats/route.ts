import { getDb } from "@/lib/db";
import { jsonResponse, preflightResponse } from "@/lib/cors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function OPTIONS() {
  return preflightResponse();
}

export async function GET() {
  const db = getDb();
  const total = db.prepare("SELECT COUNT(*) AS n FROM subscribers").get() as { n: number };
  const byOrigin = db
    .prepare("SELECT site_origin, COUNT(*) AS n FROM subscribers GROUP BY site_origin ORDER BY n DESC")
    .all() as { site_origin: string | null; n: number }[];
  return jsonResponse({ total: total.n, byOrigin });
}
