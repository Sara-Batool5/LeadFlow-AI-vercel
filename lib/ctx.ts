import { AsyncLocalStorage } from "node:async_hooks";

// Per-request workspace context. Every query in lib/db.ts reads the workspace from here,
// so one user can never see or change another user's leads.
export type Ctx = { ws: number; name: string; demo: boolean; admin: boolean };
const g = globalThis as any;
export const als: AsyncLocalStorage<Ctx> = g.__lfAls || (g.__lfAls = new AsyncLocalStorage<Ctx>());
export function ctx(): Ctx {
  const c = als.getStore();
  if (!c) throw new Error("No workspace context for this request.");
  return c;
}
