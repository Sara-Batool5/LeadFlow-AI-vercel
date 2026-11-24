import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { sessionToken } from "@/lib/auth";

export async function POST(req: Request) {
  const { password } = await req.json().catch(() => ({}));
  const expected = process.env.APP_PASSWORD;
  if (!expected) {
    return NextResponse.json({ error: "APP_PASSWORD is not set in the environment variables." }, { status: 500 });
  }
  if (!password || password !== expected) {
    return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set("lf_session", (await sessionToken())!, {
    httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 8,
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete("lf_session");
  return res;
}

export const dynamic = "force-dynamic";

// Lets the login page tell whether this browser already has a valid session.
export async function GET() {
  const t = await sessionToken();
  return NextResponse.json({ signedIn: !!t && cookies().get("lf_session")?.value === t });
}
