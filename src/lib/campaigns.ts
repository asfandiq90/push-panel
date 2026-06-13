import { getDb, type CampaignRow, type DomainRow, type SegmentFilters } from "@/lib/db";

export type CampaignInput = {
  domainId?: number | null;
  title: string;
  body?: string;
  icon?: string;
  image?: string;
  url?: string;
  action1Title?: string;
  action1Url?: string;
  action2Title?: string;
  action2Url?: string;
  audience?: string; // 'all' or an origin
  filters?: SegmentFilters | null;
  source?: string | null; // e.g. 'manual' | 'rss:<feedId>'
  scheduledAt?: number | null; // unix seconds; null = send now
};

export function createCampaign(input: CampaignInput): number {
  const db = getDb();
  const status = input.scheduledAt ? "scheduled" : "draft";
  const info = db
    .prepare(
      `INSERT INTO campaigns
        (domain_id, title, body, icon, image, url,
         action1_title, action1_url, action2_title, action2_url,
         audience, filters, source, status, scheduled_at)
       VALUES (@domain_id, @title, @body, @icon, @image, @url,
         @action1_title, @action1_url, @action2_title, @action2_url,
         @audience, @filters, @source, @status, @scheduled_at)`
    )
    .run({
      domain_id: input.domainId ?? null,
      title: input.title,
      body: input.body ?? null,
      icon: input.icon ?? null,
      image: input.image ?? null,
      url: input.url ?? null,
      action1_title: input.action1Title ?? null,
      action1_url: input.action1Url ?? null,
      action2_title: input.action2Title ?? null,
      action2_url: input.action2Url ?? null,
      audience: input.audience ?? "all",
      filters: input.filters ? JSON.stringify(input.filters) : null,
      source: input.source ?? "manual",
      status,
      scheduled_at: input.scheduledAt ?? null,
    });
  return Number(info.lastInsertRowid);
}

export function getCampaign(id: number): CampaignRow | undefined {
  return getDb().prepare("SELECT * FROM campaigns WHERE id = ?").get(id) as
    | CampaignRow
    | undefined;
}

export function listCampaigns(limit = 50): CampaignRow[] {
  return getDb()
    .prepare("SELECT * FROM campaigns ORDER BY id DESC LIMIT ?")
    .all(limit) as CampaignRow[];
}

export function dueCampaigns(now: number): CampaignRow[] {
  return getDb()
    .prepare("SELECT * FROM campaigns WHERE status = 'scheduled' AND scheduled_at <= ?")
    .all(now) as CampaignRow[];
}

export function listDomains(): DomainRow[] {
  return getDb().prepare("SELECT * FROM domains ORDER BY id ASC").all() as DomainRow[];
}

export function getDomain(id: number): DomainRow | undefined {
  return getDb().prepare("SELECT * FROM domains WHERE id = ?").get(id) as
    | DomainRow
    | undefined;
}

export function domainSubscriberCount(domainId: number): number {
  return (
    getDb()
      .prepare("SELECT COUNT(*) AS n FROM subscribers WHERE domain_id = ?")
      .get(domainId) as { n: number }
  ).n;
}

export function distinctOrigins(): string[] {
  const rows = getDb()
    .prepare(
      "SELECT site_origin FROM subscribers WHERE site_origin IS NOT NULL GROUP BY site_origin ORDER BY site_origin"
    )
    .all() as { site_origin: string }[];
  return rows.map((r) => r.site_origin);
}
