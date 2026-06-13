import { isAuthed } from "@/lib/auth";
import { createCampaign } from "@/lib/campaigns";
import { runCampaign } from "@/lib/web-push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Back-compat quick-send endpoint. Creates a one-off campaign and sends it now.
type SendBody = {
  title?: string;
  body?: string;
  url?: string;
  icon?: string;
  targetOrigin?: string;
};

export async function POST(request: Request) {
  if (!(await isAuthed())) return Response.json({ error: "Unauthorized" }, { status: 401 });

  let body: SendBody;
  try {
    body = (await request.json()) as SendBody;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.title) return Response.json({ error: "Missing title" }, { status: 400 });

  const id = createCampaign({
    title: body.title,
    body: body.body,
    url: body.url,
    icon: body.icon,
    audience: body.targetOrigin && body.targetOrigin !== "*" ? body.targetOrigin : "all",
  });
  const result = await runCampaign(id);
  return Response.json({ id, ...result });
}
