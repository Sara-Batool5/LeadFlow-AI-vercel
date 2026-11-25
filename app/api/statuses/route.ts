import { handle } from "@/lib/api";
import { allowedStatuses, STATUSES } from "@/lib/db";
export const dynamic = "force-dynamic";

// The statuses this database accepts (read from its CHECK constraint, or a sensible default).
export const GET = handle(async () => {
  const list = await allowedStatuses();
  return list.length ? list : STATUSES;
});
