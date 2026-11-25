import { NextResponse } from "next/server";
import { readSession } from "./auth";
import { als } from "./ctx";
import { ensureSchema } from "./users";

export const fail = (e: any, status?: number) =>
  NextResponse.json({ error: e?.message || String(e) }, { status: status ?? e?.status ?? 500 });

// Runs `fn` inside the signed-in user's workspace (401 if there is no valid session).
export async function withWs<T>(req: Request, fn: () => Promise<T>): Promise<T> {
  const m = /(?:^|;\s*)lf_session=([^;]+)/.exec(req.headers.get("cookie") || "");
  const s = await readSession(m?.[1]);
  if (!s) throw Object.assign(new Error("Not signed in."), { status: 401 });
  await ensureSchema();
  return als.run({ ws: s.uid, name: s.name, demo: s.demo, admin: s.admin }, fn);
}

export const handle = (fn: (req: Request, ctx: any) => Promise<any>) => async (req: Request, routeCtx: any) => {
  try { return NextResponse.json(await withWs(req, () => fn(req, routeCtx))); } catch (e: any) { return fail(e); }
};
