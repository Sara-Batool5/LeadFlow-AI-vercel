import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { authConfigured, readSession, signSession } from "@/lib/auth";
import { claimLegacyData, createUser, ensureDemo, ensureSchema, findUser } from "@/lib/users";
import { verifyPassword } from "@/lib/password";
import { fail } from "@/lib/api";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // the first demo login seeds sample data

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const bad = (msg: string, status = 400) => Object.assign(new Error(msg), { status });

export async function POST(req: Request) {
  try {
    if (!authConfigured()) throw bad("Sign-in is not configured: set AUTH_SECRET (at least 8 characters) in Vercel.", 500);
    const { action, email: rawEmail, password, name } = await req.json();
    await ensureSchema();
    const email = String(rawEmail || "").trim().toLowerCase();
    const adminEmail = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
    let session: { uid: number; name: string; demo: boolean; admin: boolean };
    let ttl = 7 * 24 * 3600;

    if (action === "demo") {
      const u = await ensureDemo();
      session = { uid: u.id, name: "Demo visitor", demo: true, admin: false }; ttl = 2 * 3600;
    } else if (action === "signup") {
      const n = String(name || "").trim();
      if (n.length < 2) throw bad("Please enter your name.");
      if (!EMAIL.test(email)) throw bad("Please enter a valid email address.");
      if (String(password || "").length < 8) throw bad("Password must be at least 8 characters.");
      if (email === adminEmail || email === "demo@leadflow.app") throw bad("This email address is reserved. Please use another one.");
      if (await findUser(email)) throw bad("An account with this email already exists. Try signing in.", 409);
      const u = await createUser(email, n, password);
      session = { uid: u.id, name: u.name, demo: false, admin: false };
    } else if (action === "signin") {
      if (!EMAIL.test(email) || !password) throw bad("Enter your email and password.");
      if (adminEmail && email === adminEmail) {
        // The owner signs in with ADMIN_EMAIL + APP_PASSWORD and takes over the pre-existing leads.
        if (!process.env.APP_PASSWORD || password !== process.env.APP_PASSWORD) throw bad("Incorrect email or password.", 401);
        const u = await createUser(email, "Admin", password);
        await claimLegacyData(u.id);
        session = { uid: u.id, name: "Admin", demo: false, admin: true }; ttl = 8 * 3600;
      } else {
        const u = await findUser(email);
        if (!u || u.is_demo || !verifyPassword(password, u.password_hash)) throw bad("Incorrect email or password.", 401);
        session = { uid: u.id, name: u.name, demo: false, admin: false };
      }
    } else throw bad("Unknown action.");

    const res = NextResponse.json({ ok: true });
    res.cookies.set("lf_session", await signSession(session, ttl), { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: ttl });
    return res;
  } catch (e) { return fail(e); }
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete("lf_session");
  return res;
}

// Lets the login page tell whether this browser already has a valid session.
export async function GET() {
  const s = await readSession(cookies().get("lf_session")?.value);
  return NextResponse.json({ signedIn: !!s, name: s?.name || null, demo: !!s?.demo });
}
