import { getDb } from "@/lib/db";
import { jsonResponse, preflightResponse } from "@/lib/cors";
import { parseBrowser, parseOs } from "@/lib/ua";
import { bumpSubscribed } from "@/lib/stats";
import { clientIpFromHeaders, lookupIp } from "@/lib/geo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SubscribeBody = {
  subscription: {
    endpoint: string;
    keys: { p256dh: string; auth: string };
  };
  siteOrigin?: string;
  userAgent?: string;
  oldEndpoint?: string;
};

export function OPTIONS() {
  return preflightResponse();
}

export async function POST(request: Request) {
  let body: SubscribeBody;
  try {
    body = (await request.json()) as SubscribeBody;
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, { status: 400 });
  }

  const sub = body.subscription;
  if (!sub?.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) {
    return jsonResponse({ error: "Missing subscription fields" }, { status: 400 });
  }

  const db = getDb();

  if (body.oldEndpoint && body.oldEndpoint !== sub.endpoint) {
    db.prepare("DELETE FROM subscribers WHERE endpoint = ?").run(body.oldEndpoint);
  }

  let domainId: number | null = null;
  if (body.siteOrigin) {
    const dom = db.prepare("SELECT id FROM domains WHERE origin = ?").get(body.siteOrigin) as
      | { id: number }
      | undefined;
    domainId = dom?.id ?? null;
  }

  const ua = body.userAgent ?? request.headers.get("user-agent") ?? null;
  const ip = clientIpFromHeaders(request.headers);
  const geo = await lookupIp(ip);

  const already = db.prepare("SELECT 1 FROM subscribers WHERE endpoint = ?").get(sub.endpoint);

  db.prepare(
    `INSERT INTO subscribers
       (endpoint, p256dh, auth, site_origin, user_agent, domain_id, browser, os,
        country, region, city, ip, last_seen)
     VALUES (@endpoint, @p256dh, @auth, @site_origin, @user_agent, @domain_id, @browser, @os,
             @country, @region, @city, @ip, unixepoch())
     ON CONFLICT(endpoint) DO UPDATE SET
       p256dh      = excluded.p256dh,
       auth        = excluded.auth,
       site_origin = excluded.site_origin,
       user_agent  = excluded.user_agent,
       domain_id   = excluded.domain_id,
       browser     = excluded.browser,
       os          = excluded.os,
       country     = COALESCE(excluded.country, subscribers.country),
       region      = COALESCE(excluded.region,  subscribers.region),
       city        = COALESCE(excluded.city,    subscribers.city),
       ip          = COALESCE(excluded.ip,      subscribers.ip),
       last_seen   = excluded.last_seen`
  ).run({
    endpoint: sub.endpoint,
    p256dh: sub.keys.p256dh,
    auth: sub.keys.auth,
    site_origin: body.siteOrigin ?? null,
    user_agent: ua,
    domain_id: domainId,
    browser: parseBrowser(ua),
    os: parseOs(ua),
    country: geo.country,
    region: geo.region,
    city: geo.city,
    ip,
  });

  if (!already) bumpSubscribed(domainId);

  return jsonResponse({ ok: true });
}
