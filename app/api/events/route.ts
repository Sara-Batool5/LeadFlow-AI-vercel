import { handle } from "@/lib/api";
import { listEvents } from "@/lib/db";
export const dynamic = "force-dynamic";
export const GET = handle(async (req) => {
  const id = new URL(req.url).searchParams.get("lead");
  return listEvents(id ? Number(id) : null);
});
