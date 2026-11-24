import { handle } from "@/lib/api";
import { runWorkflow } from "@/lib/workflow";
export const maxDuration = 60; // several sequential AI calls
export const dynamic = "force-dynamic";

export const POST = handle(async (req) => {
  const { leadData, leadId, allowDuplicate } = await req.json();
  return runWorkflow({ leadData, leadId: leadId ? Number(leadId) : undefined, allowDuplicate: !!allowDuplicate });
});
