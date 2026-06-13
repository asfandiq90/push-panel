import webpush from "web-push";
import { getDb, type CampaignRow, type DomainRow, type SegmentFilters, type SubscriberRow } from "@/lib/db";
import { selectAudience } from "@/lib/segment";

function vapidSubject(): string {
  return process.env.VAPID_SUBJECT || "mailto:admin@example.com";
}

function panelBase(): string {
  return (process.env.PANEL_BASE_URL || "http://localhost:3000").replace(/\/$/, "");
}

/** Wrap a destination URL in a click-tracking redirect through this panel. */
function track(campaignId: number, button: "main" | "a1" | "a2", target: string | null): string | undefined {
  if (!target) return undefined;
  const t = Buffer.from(target, "utf8").toString("base64url");
  return `${panelBase()}/api/click?c=${campaignId}&b=${button}&t=${t}`;
}

type NotificationOptions = {
  body?: string;
  icon?: string;
  image?: string;
  url?: string;
  actions?: { action: string; title: string }[];
  a1?: string;
  a2?: string;
};

function buildPayload(c: CampaignRow): string {
  const actions: { action: string; title: string }[] = [];
  if (c.action1_title) actions.push({ action: "a1", title: c.action1_title });
  if (c.action2_title) actions.push({ action: "a2", title: c.action2_title });

  const opts: NotificationOptions & { title: string } = {
    title: c.title,
    body: c.body ?? undefined,
    icon: c.icon ?? undefined,
    image: c.image ?? undefined,
    url: track(c.id, "main", c.url ?? panelBase()),
    a1: track(c.id, "a1", c.action1_url),
    a2: track(c.id, "a2", c.action2_url),
    actions: actions.length ? actions : undefined,
  };
  return JSON.stringify(opts);
}

export type SendResult = {
  total: number;
  sent: number;
  cleaned: number;
  failed: number;
};

const BATCH_SIZE = 50;

/**
 * Send a persisted campaign to its audience. Subscribers are grouped by domain
 * so each uses that domain's own VAPID keypair. Subscribers with no domain fall
 * back to the panel's env keypair. Dead endpoints (404/410) are pruned.
 */
export async function runCampaign(campaignId: number): Promise<SendResult> {
  const db = getDb();
  const c = db.prepare("SELECT * FROM campaigns WHERE id = ?").get(campaignId) as
    | CampaignRow
    | undefined;
  if (!c) throw new Error("Campaign not found: " + campaignId);

  db.prepare("UPDATE campaigns SET status = 'sending' WHERE id = ?").run(campaignId);

  // Resolve audience: explicit segment filters take precedence, then domain,
  // then a legacy origin audience, otherwise everyone.
  let filters: SegmentFilters | null = null;
  if (c.filters) {
    try {
      filters = JSON.parse(c.filters) as SegmentFilters;
    } catch {
      filters = null;
    }
  }
  if (!filters) {
    if (c.domain_id != null) filters = { domainId: c.domain_id };
    else if (c.audience && c.audience !== "all") filters = { origin: c.audience };
  }
  const rows: SubscriberRow[] = selectAudience(filters);

  const domains = db.prepare("SELECT * FROM domains").all() as DomainRow[];
  const byId = new Map<number, DomainRow>(domains.map((d) => [d.id, d]));
  const envPub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";
  const envPriv = process.env.VAPID_PRIVATE_KEY ?? "";

  const payload = buildPayload(c);
  const deleteStmt = db.prepare("DELETE FROM subscribers WHERE endpoint = ?");

  const result: SendResult = { total: rows.length, sent: 0, cleaned: 0, failed: 0 };

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map(async (row) => {
        const dom = row.domain_id != null ? byId.get(row.domain_id) : undefined;
        const pub = dom?.vapid_public ?? envPub;
        const priv = dom?.vapid_private ?? envPriv;
        if (!pub || !priv) {
          result.failed++;
          return;
        }
        try {
          await webpush.sendNotification(
            { endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } },
            payload,
            { vapidDetails: { subject: vapidSubject(), publicKey: pub, privateKey: priv } }
          );
          result.sent++;
        } catch (err) {
          const statusCode =
            err && typeof err === "object" && "statusCode" in err
              ? (err as { statusCode?: number }).statusCode
              : undefined;
          if (statusCode === 404 || statusCode === 410) {
            deleteStmt.run(row.endpoint);
            result.cleaned++;
          } else {
            result.failed++;
          }
        }
      })
    );
  }

  db.prepare(
    `UPDATE campaigns
       SET status = 'completed',
           total_targeted = ?,
           total_sent = ?,
           total_failed = ?,
           total_cleaned = ?,
           sent_at = unixepoch()
     WHERE id = ?`
  ).run(result.total, result.sent, result.failed, result.cleaned, campaignId);

  return result;
}
