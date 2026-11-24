import { NextResponse } from "next/server";

export const fail = (e: any, status = 500) =>
  NextResponse.json({ error: e?.message || String(e) }, { status });

// Wraps a handler so any error becomes a clean JSON response.
export const handle = (fn: (req: Request, ctx: any) => Promise<any>) => async (req: Request, ctx: any) => {
  try { return NextResponse.json(await fn(req, ctx)); } catch (e: any) { return fail(e); }
};
