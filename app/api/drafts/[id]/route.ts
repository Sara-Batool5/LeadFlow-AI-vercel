import { handle } from "@/lib/api";
import { approveDraft, deleteDraft, saveDraft } from "@/lib/db";

export const PATCH = handle(async (req, { params }) => {
  const id = Number(params.id);
  const b = await req.json();
  if (b.action === "approve") { await approveDraft(id); return { ok: true }; }
  await saveDraft(Number(b.lead_id), b.recipient_email, b.subject, b.body, id); // edit → back to pending review
  return { ok: true };
});

export const DELETE = handle(async (_r, { params }) => { await deleteDraft(Number(params.id)); return { ok: true }; });
