#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Backfills country/region/city for subscribers that have an IP stored but no
 * geo data yet (e.g. rows imported before the geo DB was installed).
 *
 * Run on the server, in the project root:
 *   node scripts/geo-backfill.js
 *
 * Subscribers without an IP cannot be backfilled — they'll be filled in
 * automatically the next time they re-subscribe (which happens whenever they
 * visit the site again, via the pushsubscriptionchange handler in the SW).
 */
const path = require("path");
const Database = require("better-sqlite3");
const maxmind = require("maxmind");

async function main() {
  const dbPath = path.resolve(
    process.cwd(),
    process.env.PUSH_DB_PATH || "./data/push-panel.db"
  );
  const geoPath = path.resolve(
    process.env.GEOIP_DB_PATH || "/var/lib/push-panel/dbip-city-lite.mmdb"
  );

  const db = new Database(dbPath);
  const reader = await maxmind.open(geoPath);

  const rows = db
    .prepare(
      "SELECT id, ip FROM subscribers WHERE ip IS NOT NULL AND country IS NULL"
    )
    .all();

  console.log(`Found ${rows.length} subscriber(s) with IP but no country.`);

  const update = db.prepare(
    "UPDATE subscribers SET country = ?, region = ?, city = ? WHERE id = ?"
  );
  let updated = 0;
  for (const r of rows) {
    const res = reader.get(r.ip);
    if (!res) continue;
    const country = res.country?.iso_code ?? res.registered_country?.iso_code ?? null;
    const region = res.subdivisions?.[0]?.names?.en ?? null;
    const city = res.city?.names?.en ?? null;
    if (country || region || city) {
      update.run(country, region, city, r.id);
      updated++;
    }
  }

  const missingIp = db
    .prepare("SELECT COUNT(*) AS n FROM subscribers WHERE ip IS NULL AND country IS NULL")
    .get().n;

  console.log(`Backfilled ${updated} of ${rows.length}.`);
  if (missingIp > 0) {
    console.log(
      `Note: ${missingIp} subscriber(s) have no IP at all (subscribed before geo capture). ` +
        `They'll fill in automatically the next time they revisit the site.`
    );
  }
  db.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
