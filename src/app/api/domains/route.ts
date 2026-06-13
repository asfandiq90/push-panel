import { isAuthed } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { generateVapidKeys } from "@/lib/vapid";
import { listDomains } from "@/lib/campaigns";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAuthed())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  return Response.json({ domains: listDomains() });
}

export async function POST(request: Request) {
  if (!(await isAuthed())) return Response.json({ error: "Unauthorized" }, { status: 401 });

  let body: { label?: string; origin?: string };
  try {
    body = (await request.json()) as { label?: string; origin?: string };
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const label = (body.label ?? "").trim();
  let origin = (body.origin ?? "").trim();
  if (!label || !origin) {
    return Response.json({ error: "label and origin are required" }, { status: 400 });
  }
  try {
    origin = new URL(origin).origin; // normalise to scheme+host[:port]
  } catch {
    return Response.json({ error: "origin must be a valid URL like https://site.com" }, { status: 400 });
  }

  const db = getDb();
  const exists = db.prepare("SELECT id FROM domains WHERE origin = ?").get(origin);
  if (exists) return Response.json({ error: "That origin already exists" }, { status: 409 });

  const keys = generateVapidKeys();
  const info = db
    .prepare(
      "INSERT INTO domains (label, origin, vapid_public, vapid_private) VALUES (?, ?, ?, ?)"
    )
    .run(label, origin, keys.publicKey, keys.privateKey);

  return Response.json({ ok: true, id: Number(info.lastInsertRowid) });
}
