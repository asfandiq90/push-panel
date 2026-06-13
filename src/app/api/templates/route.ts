import { isAuthed } from "@/lib/auth";
import { createTemplate, listTemplates, deleteTemplate } from "@/lib/templates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAuthed())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  return Response.json({ templates: listTemplates() });
}

export async function POST(request: Request) {
  if (!(await isAuthed())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  let body: Record<string, string | undefined>;
  try {
    body = (await request.json()) as Record<string, string | undefined>;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.name?.trim()) return Response.json({ error: "Name is required" }, { status: 400 });

  const id = createTemplate({
    name: body.name.trim(),
    title: body.title,
    body: body.body,
    icon: body.icon,
    image: body.image,
    url: body.url,
    action1Title: body.action1Title,
    action1Url: body.action1Url,
    action2Title: body.action2Title,
    action2Url: body.action2Url,
  });
  return Response.json({ ok: true, id });
}

export async function DELETE(request: Request) {
  if (!(await isAuthed())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const id = Number(new URL(request.url).searchParams.get("id"));
  if (!Number.isFinite(id)) return Response.json({ error: "Bad id" }, { status: 400 });
  return Response.json({ ok: true, removed: deleteTemplate(id) });
}
