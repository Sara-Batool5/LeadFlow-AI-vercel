import { handle } from "@/lib/api";
import { getLead, getQualifications, listDrafts, listEvents, setStatus, STATUSES } from "@/lib/db";
export const dynamic = "force-dynamic";

export const GET = handle(async (_r, { params }) => {
  const id = Number(params.id);
  const lead = await getLead(id);
  if (!lead) throw new Error("Lead not found.");
  const [qualifications, drafts, events] = await Promise.all([getQualifications(id), listDrafts(id), listEvents(id)]);
  return { lead, qualifications, drafts, events: events.slice(0, 15) };
});

export const PATCH = handle(async (req, { params }) => {
  const { status } = await req.json();
  if (!STATUSES.includes(status)) throw new Error("Invalid status.");
  await setStatus(Number(params.id), status);
  return { ok: true };
});
