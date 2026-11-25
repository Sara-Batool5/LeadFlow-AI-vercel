import { q } from "./db";

// Rate limiting backed by the database (serverless functions share no memory).
export function clientIp(req: Request) {
  const h = req.headers;
  return (h.get("x-vercel-forwarded-for") || h.get("x-forwarded-for") || h.get("x-real-ip") || "unknown").split(",")[0].trim();
}

const minutes = (s: number) => Math.max(1, Math.ceil(s / 60));

// Throws a 429 error if `key` already made `max` attempts of this kind inside the window.
export async function assertNotLimited(kind: string, key: string, max: number, windowSec: number, onlyFailed: boolean) {
  const [r] = await q(
    `SELECT COUNT(*)::int AS n, COALESCE(EXTRACT(EPOCH FROM (NOW() - MIN(created_at))), 0)::int AS age
     FROM login_attempts WHERE kind=$1 AND key=$2 AND created_at > NOW() - make_interval(secs => $3) ${onlyFailed ? "AND ok = FALSE" : ""}`,
    [kind, key, windowSec]);
  if (r.n >= max) {
    const m = minutes(Math.max(windowSec - r.age, 30));
    throw Object.assign(new Error(`Too many attempts. Please try again in about ${m} minute${m === 1 ? "" : "s"}.`), { status: 429 });
  }
}

export async function recordAttempt(kind: string, key: string, ok: boolean) {
  try {
    await q("INSERT INTO login_attempts (kind, key, ok) VALUES ($1,$2,$3)", [kind, key, ok]);
    if (Math.random() < 0.05) await q("DELETE FROM login_attempts WHERE created_at < NOW() - INTERVAL '2 days'");
  } catch {}
}

export const clearFailures = (kind: string, key: string) =>
  q("DELETE FROM login_attempts WHERE kind=$1 AND key=$2 AND ok = FALSE", [kind, key]).catch(() => {});
