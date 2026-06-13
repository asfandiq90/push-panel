import { getDb, type FeedRow } from "@/lib/db";
import { createCampaign } from "@/lib/campaigns";
import { runCampaign } from "@/lib/web-push";

export function listFeeds(): FeedRow[] {
  return getDb().prepare("SELECT * FROM feeds ORDER BY id DESC").all() as FeedRow[];
}

export function createFeed(input: {
  url: string;
  domainId?: number | null;
  intervalMin?: number;
}): number {
  const info = getDb()
    .prepare(
      "INSERT INTO feeds (url, domain_id, interval_min) VALUES (?, ?, ?)"
    )
    .run(input.url, input.domainId ?? null, input.intervalMin ?? 15);
  return Number(info.lastInsertRowid);
}

export function setFeedEnabled(id: number, enabled: boolean): void {
  getDb().prepare("UPDATE feeds SET enabled = ? WHERE id = ?").run(enabled ? 1 : 0, id);
}

export function deleteFeed(id: number): number {
  return getDb().prepare("DELETE FROM feeds WHERE id = ?").run(id).changes;
}

type FeedItem = { title?: string; link?: string; guid?: string; image?: string; description?: string };

/** Minimal RSS/Atom item parser — pulls the newest entry. */
function parseLatestItem(xml: string): FeedItem | null {
  // RSS <item> … </item> or Atom <entry> … </entry>
  const block =
    xml.match(/<item[\s\S]*?<\/item>/i)?.[0] ?? xml.match(/<entry[\s\S]*?<\/entry>/i)?.[0];
  if (!block) return null;

  const pick = (tag: string) => {
    const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
    if (!m) return undefined;
    return clean(m[1]);
  };

  // Atom link is an attribute: <link href="..."/>
  const atomLink = block.match(/<link[^>]*href=["']([^"']+)["']/i)?.[1];
  const image =
    block.match(/<media:content[^>]*url=["']([^"']+)["']/i)?.[1] ??
    block.match(/<enclosure[^>]*url=["']([^"']+)["']/i)?.[1];

  return {
    title: pick("title"),
    link: clean(atomLink) ?? pick("link"),
    guid: pick("guid") ?? pick("id") ?? clean(atomLink) ?? pick("link"),
    description: pick("description") ?? pick("summary"),
    image: clean(image),
  };
}

function clean(s: string | undefined): string | undefined {
  if (s == null) return undefined;
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

/** Check a single feed; if its newest item is new, create+send a campaign. */
export async function checkFeed(feed: FeedRow): Promise<{ pushed: boolean; guid?: string; error?: string }> {
  const db = getDb();
  try {
    const res = await fetch(feed.url, {
      headers: { "User-Agent": "push-panel-bot/1.0 (+rss)" },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) {
      db.prepare("UPDATE feeds SET last_checked = unixepoch(), last_status = ? WHERE id = ?").run(
        `HTTP ${res.status}`,
        feed.id
      );
      return { pushed: false, error: `HTTP ${res.status}` };
    }
    const xml = (await res.text()).slice(0, 1_000_000);
    const item = parseLatestItem(xml);

    if (!item?.guid) {
      db.prepare("UPDATE feeds SET last_checked = unixepoch(), last_status = ? WHERE id = ?").run(
        "no items",
        feed.id
      );
      return { pushed: false, error: "no items" };
    }

    // First check ever: record the guid but don't blast old content.
    if (feed.last_guid == null) {
      db.prepare(
        "UPDATE feeds SET last_guid = ?, last_checked = unixepoch(), last_status = 'primed' WHERE id = ?"
      ).run(item.guid, feed.id);
      return { pushed: false };
    }

    if (item.guid === feed.last_guid) {
      db.prepare("UPDATE feeds SET last_checked = unixepoch(), last_status = 'no change' WHERE id = ?").run(
        feed.id
      );
      return { pushed: false };
    }

    // New item — push it.
    const id = createCampaign({
      domainId: feed.domain_id ?? null,
      title: item.title ?? "New post",
      body: item.description?.slice(0, 200),
      image: item.image,
      url: item.link,
      source: `rss:${feed.id}`,
    });
    await runCampaign(id);

    db.prepare(
      "UPDATE feeds SET last_guid = ?, last_checked = unixepoch(), last_status = 'pushed' WHERE id = ?"
    ).run(item.guid, feed.id);
    return { pushed: true, guid: item.guid };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    db.prepare("UPDATE feeds SET last_checked = unixepoch(), last_status = ? WHERE id = ?").run(
      message.slice(0, 120),
      feed.id
    );
    return { pushed: false, error: message };
  }
}

/** Poll every enabled feed whose interval has elapsed. */
export async function pollDueFeeds(): Promise<void> {
  const now = Math.floor(Date.now() / 1000);
  const feeds = getDb()
    .prepare("SELECT * FROM feeds WHERE enabled = 1")
    .all() as FeedRow[];
  for (const f of feeds) {
    const due = f.last_checked == null || now - f.last_checked >= f.interval_min * 60;
    if (due) await checkFeed(f);
  }
}
