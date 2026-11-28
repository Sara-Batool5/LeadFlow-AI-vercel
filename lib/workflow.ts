import { ctx } from "./ctx";
import { addEvent, assignAuto, createLead, findDuplicates, getLead, getQualifications, saveDraft, saveQualification, setPriority, setStatus, similarOutcomes } from "./db";
import { decideRoute, draftEmail, modelName, qualifyLead } from "./ai";

export type Stage = { key: string; label: string; status: "done" | "skipped" | "failed" | "waiting"; detail: string };

export const STAGES: [string, string][] = [
  ["intake_validation", "Intake Validation"],
  ["duplicate_detection", "Duplicate Detection"],
  ["lead_creation", "Lead Creation"],
  ["qualification", "AI Qualification"],
  ["memory_retrieval", "Memory Retrieval"],
  ["ai_decision", "AI Decision"],
  ["owner_assignment", "Owner Assignment"],
  ["email_draft", "Email Draft"],
];

/**
 * Runs the 8-stage lead pipeline (same stages and routing as the original LangGraph workflow).
 * Pass `leadData` for a new lead, or `leadId` to run/resume the pipeline for an existing lead.
 * Nothing is ever emailed — drafts wait for human approval.
 */
export async function runWorkflow(opts: { leadData?: any; leadId?: number; allowDuplicate?: boolean; requalify?: boolean }) {
  const stages: Stage[] = STAGES.map(([key, label]) => ({ key, label, status: "waiting", detail: "" }));
  const mark = (key: string, status: Stage["status"], detail: string) => {
    const s = stages.find((x) => x.key === key)!; s.status = status; s.detail = detail;
  };
  const result: any = { stages, leadId: null, route: "continue", decision: null, qualification: null, draftId: null, matches: [], error: null };
  let leadId = opts.leadId || null;
  let lead: any = null;

  try {
    if (leadId) {
      lead = await getLead(leadId);
      if (!lead) throw new Error("The selected lead could not be found.");
      ["intake_validation", "duplicate_detection", "lead_creation"].forEach((k) => mark(k, "skipped", "Existing lead"));
    } else {
      // 1. Intake validation
      const d = opts.leadData || {};
      if (!String(d.contact_name || "").trim() || !String(d.email || "").trim()) throw new Error("Contact name and email are required.");
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(d.email).trim())) throw new Error("Please enter a valid email address.");
      mark("intake_validation", "done", "Required fields are valid.");

      // 2. Duplicate detection
      const matches = await findDuplicates(d);
      result.matches = matches;
      if (matches.length && !opts.allowDuplicate) {
        mark("duplicate_detection", "failed", `${matches.length} possible duplicate(s) found. Human confirmation required.`);
        result.route = "duplicate_review";
        return result;
      }
      mark("duplicate_detection", "done", matches.length ? "Duplicates found; creation confirmed by a human." : "No duplicates found.");

      // 3. Lead creation
      const created = await createLead(d, "agent_workflow");
      leadId = created.id; result.leadId = leadId;
      mark("lead_creation", "done", `Created ${created.lead_reference}.`);
      lead = await getLead(leadId!);
    }
    result.leadId = leadId;

    // 4. Qualification (reuse a saved result when resuming)
    const saved = opts.leadId && !opts.requalify ? (await getQualifications(leadId!))[0] : null;
    let qual: any;
    if (saved) {
      qual = { ...saved, missing_information: saved.missing_information || [] };
      mark("qualification", "skipped", `Reused saved result (score ${saved.score}).`);
    } else {
      qual = await qualifyLead(lead);
      await saveQualification(leadId!, qual, modelName());
      await setPriority(leadId!, qual.category);
      await addEvent(leadId, "ai_qualification_completed", "AI lead qualification completed.", qual);
      mark("qualification", "done", `Score ${qual.score} · ${qual.category}`);
    }
    result.qualification = qual;

    // 5. Memory retrieval (never blocks the workflow)
    let memories: any[] = [];
    try {
      memories = await similarOutcomes(lead.industry, leadId!);
      mark("memory_retrieval", "done", `${memories.length} similar past outcome(s) found.`);
    } catch {
      mark("memory_retrieval", "skipped", "Memory unavailable; continuing without it.");
    }

    // 6. AI decision
    const decision = await decideRoute(lead, qual, memories);
    result.decision = decision; result.route = decision.decision_category;
    await addEvent(leadId, "ai_decision_made", `AI decision: ${decision.decision_category}.`, { ...decision, decision_route: decision.decision_category });
    mark("ai_decision", "done", `${decision.decision_category} — ${decision.reasoning}`);

    if (decision.decision_category !== "prioritize_sales") {
      mark("owner_assignment", "skipped", "Not required for this decision.");
      mark("email_draft", "skipped", "Not required for this decision.");
      await addEvent(leadId, "agent_workflow_outcome_recorded", `Agent workflow outcome recorded: ${decision.decision_category}.`, { outcome: decision.decision_category, outcome_recorded: true });
      return result;
    }
    await setStatus(leadId!, "qualified");

    // 7. Owner assignment
    const assignment = await assignAuto(leadId!);
    mark("owner_assignment", assignment.ok ? "done" : "failed", assignment.message);

    // 8. Email draft (pending human approval)
    try {
      const fresh = await getLead(leadId!);
      const email = await draftEmail(fresh, qual, "Introductory follow-up after an inquiry", "Professional and friendly", decision.next_action || "");
      result.draftId = await saveDraft(leadId!, fresh.email, email.subject, email.body);
      mark("email_draft", "done", `Draft saved for review: "${email.subject}"`);
    } catch (e: any) {
      mark("email_draft", "failed", e.message);
    }
    await addEvent(leadId, "agent_workflow_outcome_recorded", "Agent workflow outcome recorded: prioritize_sales.", { outcome: "prioritize_sales", outcome_recorded: true });
    return result;
  } catch (e: any) {
    result.error = e.message;
    const current = stages.find((s) => s.status === "waiting");
    if (current) mark(current.key, "failed", e.message);
    try {
      await addEvent(leadId, "workflow_failure_detected", "The lead workflow stopped because of an error.", { failure_stage: current?.key, failure_message: e.message, lead_created_before_failure: !!leadId }, "failed");
    } catch {}
    return result;
  }
}

// A person overrides the AI and sends a lead to sales: qualify, assign an owner and draft the follow-up.
export async function humanApprove(leadId: number) {
  const lead = await getLead(leadId);
  if (!lead) throw new Error("Lead not found.");
  const qual = (await getQualifications(leadId))[0] || null;
  await setStatus(leadId, "qualified");
  await addEvent(leadId, "human_override_approved", "A person approved this lead for sales follow-up.", { previous_status: lead.status }, "completed", ctx().name);
  const assignment = await assignAuto(leadId);
  let draftId: number | null = null, draftError: string | null = null;
  try {
    const fresh = await getLead(leadId);
    const email = await draftEmail(fresh, qual, "Introductory follow-up after an inquiry", "Professional and friendly", qual?.recommended_next_action || "");
    draftId = await saveDraft(leadId, fresh.email, email.subject, email.body);
  } catch (e: any) { draftError = e.message; }
  return { assignment, draftId, draftError };
}
