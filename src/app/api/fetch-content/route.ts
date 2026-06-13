import { isAuthed } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function metaContent(html: string, ...names: string[]): string | undefined {
  for (const name of names) {
    // property="og:title" content="..."  OR  name="..." content="..."
    const re = new RegExp(
      `<meta[^>]+(?:property|name)=["']${name}["'][^>]*content=["']([^"']*)["']`,
      "i"
    );
    const m = html.match(re);
    if (m?.[1]) return decodeEntities(m[1]);
    // reversed attribute order
    const re2 = new RegExp(
      `<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${name}["']`,
      "i"
    );
    const m2 = html.match(re2);
    if (m2?.[1]) return decodeEntities(m2[1]);
  }
  return undefined;
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/gi, "'");
}

export async function GET(request: Request) {
  if (!(await isAuthed())) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url).searchParams.get("url");
  if (!url) return Response.json({ error: "Missing url" }, { status: 400 });

  let target: URL;
  try {
    target = new URL(url);
    if (!/^https?:$/.test(target.protocol)) throw new Error("bad protocol");
  } catch {
    return Response.json({ error: "Invalid URL" }, { status: 400 });
  }

  let html: string;
  try {
    const res = await fetch(target.toString(), {
      headers: { "User-Agent": "push-panel-bot/1.0 (+content-fetcher)" },
      redirect: "follow",
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return Response.json({ error: `Fetch failed (${res.status})` }, { status: 502 });
    html = (await res.text()).slice(0, 500_000);
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Fetch error" },
      { status: 502 }
    );
  }

  const titleTag = html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1];
  const title = metaContent(html, "og:title", "twitter:title") ?? (titleTag ? decodeEntities(titleTag) : undefined);
  const description = metaContent(html, "og:description", "twitter:description", "description");
  let image = metaContent(html, "og:image", "twitter:image", "twitter:image:src");
  if (image) {
    try {
      image = new URL(image, target).toString(); // resolve relative image URLs
    } catch {
      /* leave as-is */
    }
  }

  return Response.json({
    title: title?.trim() ?? "",
    description: description?.trim() ?? "",
    image: image ?? "",
    url: target.toString(),
  });
}
