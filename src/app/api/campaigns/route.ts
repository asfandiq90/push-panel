import { isAuthed } from "@/lib/auth";
import { createCampaign, listCampaigns, type CampaignInput } from "@/lib/campaigns";
import { runCampaign } from "@/lib/web-push";
import { createTemplate } from "@/lib/templates";
import type { SegmentFilters } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAuthed())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  return Response.json({ campaigns: listCampaigns() });
}

type Body = {
  domainId?: number | null;
  title?: string;
  body?: string;
  icon?: string;
  image?: string;
  url?: string;
  action1Title?: string;
  action1Url?: string;
  action2Title?: string;
  action2Url?: string;
  audience?: string;
  browser?: string;
  os?: string;
  country?: string;
  saveAsTemplate?: string; // template name; if present, also save a template
  sendNow?: boolean;
  scheduledAt?: string | number | null; // ISO string or unix seconds
};

export async function POST(request: Request) {
  if (!(await isAuthed())) return Response.json({ error: "Unauthorized" }, { status: 401 });

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.title || !body.title.trim()) {
    return Response.json({ error: "Title is required" }, { status: 400 });
  }

  let scheduledAt: number | null = null;
  if (!body.sendNow && body.scheduledAt != null) {
    const secs =
      typeof body.scheduledAt === "number"
        ? body.scheduledAt
        : Math.floor(new Date(body.scheduledAt).getTime() / 1000);
    if (!Number.isFinite(secs)) {
      return Response.json({ error: "Invalid scheduledAt" }, { status: 400 });
    }
    scheduledAt = secs;
  }

  const filters: SegmentFilters = {};
  if (body.domainId != null) filters.domainId = body.domainId;
  if (body.browser) filters.browser = body.browser;
  if (body.os) filters.os = body.os;
  if (body.country) filters.country = body.country;
  const hasFilters = Object.keys(filters).length > 0;

  const input: CampaignInput = {
    domainId: body.domainId ?? null,
    title: body.title.trim(),
    body: body.body,
    icon: body.icon,
    image: body.image,
    url: body.url,
    action1Title: body.action1Title,
    action1Url: body.action1Url,
    action2Title: body.action2Title,
    action2Url: body.action2Url,
    audience: body.audience ?? "all",
    filters: hasFilters ? filters : null,
    scheduledAt,
  };

  if (body.saveAsTemplate?.trim()) {
    createTemplate({
      name: body.saveAsTemplate.trim(),
      title: input.title,
      body: input.body,
      icon: input.icon,
      image: input.image,
      url: input.url,
      action1Title: input.action1Title,
      action1Url: input.action1Url,
      action2Title: input.action2Title,
      action2Url: input.action2Url,
    });
  }

  const id = createCampaign(input);

  if (scheduledAt) {
    return Response.json({ ok: true, id, scheduled: true, scheduledAt });
  }

  const result = await runCampaign(id);
  return Response.json({ ok: true, id, scheduled: false, result });
}
