import { buildSessionCookieValue, checkPassword, sessionCookieHeader } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: { password?: string };
  try {
    body = (await request.json()) as { password?: string };
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.password || !checkPassword(body.password)) {
    return Response.json({ error: "Wrong password" }, { status: 401 });
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Set-Cookie": sessionCookieHeader(buildSessionCookieValue()),
    },
  });
}
