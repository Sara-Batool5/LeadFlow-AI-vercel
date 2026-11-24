// Edge-safe session helper (Web Crypto). The cookie holds a hash of APP_PASSWORD,
// so changing the password in Vercel signs everyone out.
export async function sessionToken(): Promise<string | null> {
  const pw = process.env.APP_PASSWORD;
  if (!pw) return null;
  const data = new TextEncoder().encode(pw + "|leadflow-ai|v1");
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
