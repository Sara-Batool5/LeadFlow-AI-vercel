import { handle } from "@/lib/api";
import { getLead, getQualifications, saveDraft } from "@/lib/db";
import { draftEmail } from "@/lib/ai";
export const maxDuration = 60;

export const POST = handle(async (req, { params }) => {
  const id = Number(params.id);
  const { purpose, tone, extra } = await req.json();
  const lead = await getLead(id);
  if (!lead) throw new Error("Lead not found.");
  const qual = (await getQualifications(id))[0] || null;
  const email = await draftEmail(lead, qual, purpose || "Introductory follow-up after an inquiry", tone || "Professional and friendly", extra || "");
  const draftId = await saveDraft(id, lead.email, email.subject, email.body);
  return { draftId, ...email };
});
