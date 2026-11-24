import { handle } from "@/lib/api";
import { assignAuto, assignManual } from "@/lib/db";

export const POST = handle(async (req, { params }) => {
  const id = Number(params.id);
  const { ownerId } = await req.json().catch(() => ({}));
  if (ownerId === undefined) return assignAuto(id);       // automatic: industry match + workload balancing
  await assignManual(id, ownerId ? Number(ownerId) : null); // manual choice (or null to unassign)
  return { ok: true, message: ownerId ? "Owner assigned." : "Owner removed." };
});
