// Edge-safe signed session cookies (Web Crypto HMAC). Used by middleware and API routes.
export type Session = { uid: number; name: string; demo: boolean; admin: boolean; exp: number };

const enc = new TextEncoder();
// AUTH_SECRET is preferred; APP_PASSWORD is accepted so existing deployments keep working.
const secret = () => process.env.AUTH_SECRET || process.env.APP_PASSWORD || "";
export const authConfigured = () => secret().length >= 8;

async function hmac(data: string) {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret()), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
const toB64 = (s: string) => btoa(String.fromCharCode(...enc.encode(s))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const fromB64 = (s: string) => {
  const p = s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4);
  return new TextDecoder().decode(Uint8Array.from(atob(p), (c) => c.charCodeAt(0)));
};

export async function signSession(s: Omit<Session, "exp">, ttlSeconds: number) {
  const body = toB64(JSON.stringify({ ...s, exp: Math.floor(Date.now() / 1000) + ttlSeconds }));
  return `${body}.${await hmac(body)}`;
}

export async function readSession(token?: string | null): Promise<Session | null> {
  if (!token || !authConfigured()) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = await hmac(body);
  if (expected.length !== sig.length) return null;
  let diff = 0;
  for (let i = 0; i < sig.length; i++) diff |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
  if (diff !== 0) return null;
  try {
    const s = JSON.parse(fromB64(body)) as Session;
    return s.exp > Date.now() / 1000 ? s : null;
  } catch { return null; }
}
