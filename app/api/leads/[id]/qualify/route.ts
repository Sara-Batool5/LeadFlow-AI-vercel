import { handle } from "@/lib/api";
import { addEvent, getLead, saveQualification, setPriority } from "@/lib/db";
import { modelName, qualifyLead } from "@/lib/ai";
export const maxDuration = 60;

export const POST = handle(async (_r, { params }) => {
  const id = Number(params.id);
  const lead = await getLead(id);
  if (!lead) throw new Error("Lead not found.");
  const result = await qualifyLead(lead);
  await saveQualification(id, result, modelName());
  await setPriority(id, result.category);
  await addEvent(id, "ai_qualification_completed", "AI lead qualification completed.", result);
  return result;
});
