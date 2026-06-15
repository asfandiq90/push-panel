import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { open, type Reader, type CityResponse } from "maxmind";

let _reader: Reader<CityResponse> | null = null;
let _loadAttempted = false;

function dbPath(): string {
  return resolve(process.env.GEOIP_DB_PATH ?? "/var/lib/push-panel/dbip-city-lite.mmdb");
}

async function getReader(): Promise<Reader<CityResponse> | null> {
  if (_reader) return _reader;
  if (_loadAttempted) return null; // don't retry on every call once we've failed
  _loadAttempted = true;
  const path = dbPath();
  if (!existsSync(path)) {
    // eslint-disable-next-line no-console
    console.warn(`[geo] DB not found at ${path} — geo lookups disabled.`);
    return null;
  }
  try {
    _reader = await open<CityResponse>(path);
    // eslint-disable-next-line no-console
    console.log(`[geo] loaded ${path}`);
    return _reader;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(`[geo] failed to load ${path}:`, err);
    return null;
  }
}

export type Geo = {
  country: string | null; // ISO 3166-1 alpha-2 (e.g. "GR")
  region: string | null;
  city: string | null;
};

const EMPTY: Geo = { country: null, region: null, city: null };

export function isPrivateIp(ip: string): boolean {
  if (!ip) return true;
  if (ip === "127.0.0.1" || ip === "::1") return true;
  if (ip.startsWith("10.")) return true;
  if (ip.startsWith("192.168.")) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(ip)) return true;
  if (ip.startsWith("fc") || ip.startsWith("fd")) return true; // unique local IPv6
  if (ip.startsWith("fe80:")) return true; // link-local IPv6
  return false;
}

/** Look up an IP. Returns nulls if no DB, no match, or a private IP. */
export async function lookupIp(ip: string | null | undefined): Promise<Geo> {
  if (!ip || isPrivateIp(ip)) return EMPTY;
  const reader = await getReader();
  if (!reader) return EMPTY;
  try {
    const res = reader.get(ip);
    if (!res) return EMPTY;
    const c = res.country?.iso_code ?? res.registered_country?.iso_code ?? null;
    const subdivisions = res.subdivisions ?? [];
    const region = subdivisions[0]?.names?.en ?? null;
    const city = res.city?.names?.en ?? null;
    return { country: c, region, city };
  } catch {
    return EMPTY;
  }
}

/** First IP from a comma-separated X-Forwarded-For header. */
export function clientIpFromHeaders(headers: Headers): string | null {
  const xff = headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  return headers.get("x-real-ip") ?? null;
}
