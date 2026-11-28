import { handle } from "@/lib/api";
import { addEvent, assertAiAllowed, getLead, setStatus } from "@/lib/db";
import { ctx } from "@/lib/ctx";
import { humanApprove } from "@/lib/workflow";
export const maxDuration = 60;

// A person resolves an item in the Human Review queue.
export const POST = handle(async (req, { params }) => {
  const id = Number(params.id);
  const { action } = await req.json();
  if (!(await getLead(id))) throw new Error("Lead not found.");
  if (action === "approve") {
    await assertAiAllowed();
    const r = await humanApprove(id);
    return { ok: true, message: `${r.assignment.message}${r.draftId ? " A draft was saved for approval." : r.draftError ? ` (Draft failed: ${r.draftError})` : ""}` };
  }
  if (action === "disqualify") {
    await setStatus(id, "disqualified");
    await addEvent(id, "human_override_disqualified", "A person marked this lead as not a fit.", {}, "completed", ctx().name);
    return { ok: true, message: "Lead marked as disqualified." };
  }
  throw new Error("Unknown action.");
});
