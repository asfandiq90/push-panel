import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

let _db: Database.Database | null = null;

function hasColumn(db: Database.Database, table: string, column: string): boolean {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  return cols.some((c) => c.name === column);
}

function migrate(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS subscribers (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      endpoint    TEXT    NOT NULL UNIQUE,
      p256dh      TEXT    NOT NULL,
      auth        TEXT    NOT NULL,
      site_origin TEXT,
      user_agent  TEXT,
      created_at  INTEGER NOT NULL DEFAULT (unixepoch())
    );
    CREATE INDEX IF NOT EXISTS idx_subscribers_site_origin ON subscribers(site_origin);

    CREATE TABLE IF NOT EXISTS domains (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      label        TEXT    NOT NULL,
      origin       TEXT    NOT NULL UNIQUE,
      vapid_public TEXT    NOT NULL,
      vapid_private TEXT   NOT NULL,
      created_at   INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS campaigns (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      domain_id      INTEGER,
      title          TEXT    NOT NULL,
      body           TEXT,
      icon           TEXT,
      image          TEXT,
      url            TEXT,
      action1_title  TEXT,
      action1_url    TEXT,
      action2_title  TEXT,
      action2_url    TEXT,
      audience       TEXT    NOT NULL DEFAULT 'all',
      status         TEXT    NOT NULL DEFAULT 'draft',
      scheduled_at   INTEGER,
      total_targeted INTEGER NOT NULL DEFAULT 0,
      total_sent     INTEGER NOT NULL DEFAULT 0,
      total_failed   INTEGER NOT NULL DEFAULT 0,
      total_cleaned  INTEGER NOT NULL DEFAULT 0,
      clicks         INTEGER NOT NULL DEFAULT 0,
      action1_clicks INTEGER NOT NULL DEFAULT 0,
      action2_clicks INTEGER NOT NULL DEFAULT 0,
      created_at     INTEGER NOT NULL DEFAULT (unixepoch()),
      sent_at        INTEGER
    );
    CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
    CREATE INDEX IF NOT EXISTS idx_campaigns_scheduled ON campaigns(scheduled_at);

    CREATE TABLE IF NOT EXISTS daily_stats (
      day          TEXT    NOT NULL,
      domain_id    INTEGER,
      subscribed   INTEGER NOT NULL DEFAULT 0,
      unsubscribed INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (day, domain_id)
    );

    CREATE TABLE IF NOT EXISTS templates (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      name           TEXT    NOT NULL,
      title          TEXT,
      body           TEXT,
      icon           TEXT,
      image          TEXT,
      url            TEXT,
      action1_title  TEXT,
      action1_url    TEXT,
      action2_title  TEXT,
      action2_url    TEXT,
      created_at     INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS feeds (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      domain_id     INTEGER,
      url           TEXT    NOT NULL,
      enabled       INTEGER NOT NULL DEFAULT 1,
      interval_min  INTEGER NOT NULL DEFAULT 15,
      last_guid     TEXT,
      last_checked  INTEGER,
      last_status   TEXT,
      created_at    INTEGER NOT NULL DEFAULT (unixepoch())
    );
  `);

  if (!hasColumn(db, "campaigns", "filters")) {
    db.exec("ALTER TABLE campaigns ADD COLUMN filters TEXT");
  }
  if (!hasColumn(db, "campaigns", "source")) {
    db.exec("ALTER TABLE campaigns ADD COLUMN source TEXT");
  }

  // Additive column migrations for existing subscriber tables.
  if (!hasColumn(db, "subscribers", "domain_id")) {
    db.exec("ALTER TABLE subscribers ADD COLUMN domain_id INTEGER");
  }
  if (!hasColumn(db, "subscribers", "browser")) {
    db.exec("ALTER TABLE subscribers ADD COLUMN browser TEXT");
  }
  if (!hasColumn(db, "subscribers", "os")) {
    db.exec("ALTER TABLE subscribers ADD COLUMN os TEXT");
  }
  if (!hasColumn(db, "subscribers", "country")) {
    db.exec("ALTER TABLE subscribers ADD COLUMN country TEXT");
  }
  if (!hasColumn(db, "subscribers", "last_seen")) {
    db.exec("ALTER TABLE subscribers ADD COLUMN last_seen INTEGER");
  }
  if (!hasColumn(db, "subscribers", "city")) {
    db.exec("ALTER TABLE subscribers ADD COLUMN city TEXT");
  }
  if (!hasColumn(db, "subscribers", "region")) {
    db.exec("ALTER TABLE subscribers ADD COLUMN region TEXT");
  }
  if (!hasColumn(db, "subscribers", "ip")) {
    db.exec("ALTER TABLE subscribers ADD COLUMN ip TEXT");
  }
  db.exec("CREATE INDEX IF NOT EXISTS idx_subscribers_domain ON subscribers(domain_id)");
  db.exec("CREATE INDEX IF NOT EXISTS idx_subscribers_country ON subscribers(country)");
}

function seedDefaultDomain(db: Database.Database) {
  const base = process.env.PANEL_BASE_URL ?? "http://localhost:3000";
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";
  const priv = process.env.VAPID_PRIVATE_KEY ?? "";
  if (!pub || !priv) return;

  const existing = db.prepare("SELECT id FROM domains WHERE origin = ?").get(base) as
    | { id: number }
    | undefined;
  if (existing) return;

  const info = db
    .prepare(
      "INSERT INTO domains (label, origin, vapid_public, vapid_private) VALUES (?, ?, ?, ?)"
    )
    .run("This panel (demo)", base, pub, priv);

  // Attach any pre-existing subscribers that match this origin to the default domain.
  db.prepare("UPDATE subscribers SET domain_id = ? WHERE domain_id IS NULL AND site_origin = ?").run(
    info.lastInsertRowid,
    base
  );
}

export function getDb(): Database.Database {
  if (_db) return _db;

  const dbPath = resolve(
    /*turbopackIgnore: true*/ process.cwd(),
    process.env.PUSH_DB_PATH ?? "./data/push-panel.db"
  );
  mkdirSync(dirname(dbPath), { recursive: true });

  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  migrate(db);
  seedDefaultDomain(db);

  _db = db;
  return db;
}

export type SubscriberRow = {
  id: number;
  endpoint: string;
  p256dh: string;
  auth: string;
  site_origin: string | null;
  user_agent: string | null;
  domain_id: number | null;
  browser: string | null;
  os: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
  ip: string | null;
  last_seen: number | null;
  created_at: number;
};

export type DomainRow = {
  id: number;
  label: string;
  origin: string;
  vapid_public: string;
  vapid_private: string;
  created_at: number;
};

export type CampaignRow = {
  id: number;
  domain_id: number | null;
  title: string;
  body: string | null;
  icon: string | null;
  image: string | null;
  url: string | null;
  action1_title: string | null;
  action1_url: string | null;
  action2_title: string | null;
  action2_url: string | null;
  audience: string;
  status: "draft" | "scheduled" | "sending" | "completed" | "failed";
  scheduled_at: number | null;
  total_targeted: number;
  total_sent: number;
  total_failed: number;
  total_cleaned: number;
  clicks: number;
  action1_clicks: number;
  action2_clicks: number;
  filters: string | null;
  source: string | null;
  created_at: number;
  sent_at: number | null;
};

export type TemplateRow = {
  id: number;
  name: string;
  title: string | null;
  body: string | null;
  icon: string | null;
  image: string | null;
  url: string | null;
  action1_title: string | null;
  action1_url: string | null;
  action2_title: string | null;
  action2_url: string | null;
  created_at: number;
};

export type FeedRow = {
  id: number;
  domain_id: number | null;
  url: string;
  enabled: number;
  interval_min: number;
  last_guid: string | null;
  last_checked: number | null;
  last_status: string | null;
  created_at: number;
};

export type SegmentFilters = {
  browser?: string;
  os?: string;
  country?: string;
  domainId?: number;
  origin?: string;
};
