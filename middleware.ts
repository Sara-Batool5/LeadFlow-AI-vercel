import { NextRequest, NextResponse } from "next/server";
import { readSession } from "@/lib/auth";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname === "/api/login") return NextResponse.next();

  if (await readSession(req.cookies.get("lf_session")?.value)) return NextResponse.next();

  if (pathname.startsWith("/api/")) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = { matcher: ["/dashboard/:path*", "/api/:path*"] };
