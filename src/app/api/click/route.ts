import { getDb } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Public endpoint: notification clicks land here so we can count them, then
// 302-redirect to the real destination. No auth (subscribers are anonymous).
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const campaignId = Number(params.get("c"));
  const button = params.get("b") ?? "main";
  const encoded = params.get("t");

  let target = process.env.PANEL_BASE_URL || "http://localhost:3000";
  if (encoded) {
    try {
      const decoded = Buffer.from(encoded, "base64url").toString("utf8");
      const u = new URL(decoded);
      if (/^https?:$/.test(u.protocol)) target = u.toString();
    } catch {
      /* fall back to panel base */
    }
  }

  if (Number.isFinite(campaignId) && campaignId > 0) {
    const col =
      button === "a1" ? "action1_clicks" : button === "a2" ? "action2_clicks" : "clicks";
    try {
      getDb()
        .prepare(`UPDATE campaigns SET ${col} = ${col} + 1 WHERE id = ?`)
        .run(campaignId);
    } catch {
      /* never block the redirect on a counter failure */
    }
  }

  return new Response(null, { status: 302, headers: { Location: target } });
}
