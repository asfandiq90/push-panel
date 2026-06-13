import { isAuthed } from "@/lib/auth";
import { getDb, type FeedRow } from "@/lib/db";
import { listFeeds, createFeed, setFeedEnabled, deleteFeed, checkFeed } from "@/lib/feeds";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAuthed())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  return Response.json({ feeds: listFeeds() });
}

export async function POST(request: Request) {
  if (!(await isAuthed())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  let body: { url?: string; domainId?: number | null; intervalMin?: number; action?: string; id?: number };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Manual "check now" trigger.
  if (body.action === "check" && body.id) {
    const feed = getDb().prepare("SELECT * FROM feeds WHERE id = ?").get(body.id) as
      | FeedRow
      | undefined;
    if (!feed) return Response.json({ error: "Feed not found" }, { status: 404 });
    const res = await checkFeed(feed);
    return Response.json({ ok: true, ...res });
  }

  if (body.action === "toggle" && body.id != null) {
    const feed = getDb().prepare("SELECT enabled FROM feeds WHERE id = ?").get(body.id) as
      | { enabled: number }
      | undefined;
    if (!feed) return Response.json({ error: "Feed not found" }, { status: 404 });
    setFeedEnabled(body.id, feed.enabled === 0);
    return Response.json({ ok: true });
  }

  if (!body.url?.trim()) return Response.json({ error: "Feed URL is required" }, { status: 400 });
  try {
    new URL(body.url);
  } catch {
    return Response.json({ error: "Invalid URL" }, { status: 400 });
  }
  const id = createFeed({
    url: body.url.trim(),
    domainId: body.domainId ?? null,
    intervalMin: body.intervalMin,
  });
  return Response.json({ ok: true, id });
}

export async function DELETE(request: Request) {
  if (!(await isAuthed())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const id = Number(new URL(request.url).searchParams.get("id"));
  if (!Number.isFinite(id)) return Response.json({ error: "Bad id" }, { status: 400 });
  return Response.json({ ok: true, removed: deleteFeed(id) });
}
