import { getDb } from "@/lib/db";
import { jsonResponse, preflightResponse } from "@/lib/cors";
import { bumpUnsubscribed } from "@/lib/stats";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type UnsubscribeBody = { endpoint?: string };

export function OPTIONS() {
  return preflightResponse();
}

export async function POST(request: Request) {
  let body: UnsubscribeBody;
  try {
    body = (await request.json()) as UnsubscribeBody;
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.endpoint) {
    return jsonResponse({ error: "Missing endpoint" }, { status: 400 });
  }

  const db = getDb();
  const existing = db
    .prepare("SELECT domain_id FROM subscribers WHERE endpoint = ?")
    .get(body.endpoint) as { domain_id: number | null } | undefined;
  const result = db.prepare("DELETE FROM subscribers WHERE endpoint = ?").run(body.endpoint);

  if (existing && result.changes > 0) bumpUnsubscribed(existing.domain_id);

  return jsonResponse({ ok: true, removed: result.changes });
}
