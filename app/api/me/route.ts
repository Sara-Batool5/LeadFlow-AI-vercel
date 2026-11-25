import { handle } from "@/lib/api";
import { ctx } from "@/lib/ctx";
export const dynamic = "force-dynamic";
export const GET = handle(async () => { const c = ctx(); return { name: c.name, demo: c.demo, admin: c.admin }; });
