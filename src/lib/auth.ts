import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "node:crypto";

const COOKIE_NAME = "admin_session";
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) {
    throw new Error("SESSION_SECRET is missing or too short in .env.local");
  }
  return s;
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("hex");
}

export function buildSessionCookieValue(): string {
  const payload = JSON.stringify({ iat: Date.now() });
  const b64 = Buffer.from(payload, "utf8").toString("base64url");
  const sig = sign(payload);
  return `${b64}.${sig}`;
}

function verify(value: string | undefined): boolean {
  if (!value) return false;
  const [b64, sig] = value.split(".");
  if (!b64 || !sig) return false;

  let payload: string;
  try {
    payload = Buffer.from(b64, "base64url").toString("utf8");
  } catch {
    return false;
  }

  const expected = sign(payload);
  const a = Buffer.from(sig, "hex");
  const b = Buffer.from(expected, "hex");
  if (a.length !== b.length) return false;
  if (!timingSafeEqual(a, b)) return false;

  try {
    const { iat } = JSON.parse(payload) as { iat: number };
    if (typeof iat !== "number") return false;
    if (Date.now() - iat > SESSION_TTL_MS) return false;
  } catch {
    return false;
  }
  return true;
}

export async function isAuthed(): Promise<boolean> {
  const store = await cookies();
  return verify(store.get(COOKIE_NAME)?.value);
}

export function sessionCookieHeader(value: string, opts?: { delete?: boolean }): string {
  const maxAge = opts?.delete ? 0 : Math.floor(SESSION_TTL_MS / 1000);
  const flags = [
    `${COOKIE_NAME}=${value}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${maxAge}`,
  ];
  if (process.env.NODE_ENV === "production") flags.push("Secure");
  return flags.join("; ");
}

export function checkPassword(submitted: string): boolean {
  const expected = process.env.ADMIN_PASSWORD ?? "";
  if (!expected) return false;
  const a = Buffer.from(submitted);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export const SESSION_COOKIE_NAME = COOKIE_NAME;
