import { Pool } from "pg";

// ---------------------------------------------------------------------------
// Connection (same Neon PostgreSQL database the Streamlit app used)
// ---------------------------------------------------------------------------
const g = globalThis as any;

function pool(): Pool {
  if (!g.__lfPool) {
    const url = process.env.NEON_DATABASE_URL;
    if (!url) throw new Error("NEON_DATABASE_URL is not set. Add it in Vercel → Settings → Environment Variables.");
    g.__lfPool = new Pool({ connectionString: url, max: 3, idleTimeoutMillis: 10_000, connectionTimeoutMillis: 20_000, ssl: { rejectUnauthorized: false } });
  }
  return g.__lfPool;
}

export async function q<T = any>(text: string, params: any[] = []): Promise<T[]> {
  const res = await pool().query(text, params);
  return res.rows as T[];
}

const clean = (v: any) => (v === null || v === undefined ? "" : String(v).trim());
const norm = (v: any) => clean(v).toLowerCase().replace(/\s+/g, " ");
const normSite = (v: any) => clean(v).toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0].trim();

export const STATUSES = ["new", "contacted", "qualified", "in progress", "closed", "won", "lost", "disqualified"];

export function normalizePriority(value: any) {
  const v = clean(value).toLowerCase();
  if (["unassessed", "low", "medium", "high", "urgent"].includes(v)) return v;
  return ({ high_fit: "high", medium_fit: "medium", low_fit: "low", needs_review: "unassessed" } as any)[v] || "unassessed";
}

// ---------------------------------------------------------------------------
// Health / setup
// ---------------------------------------------------------------------------
export async function health() {
  try {
    const [row] = await q("SELECT version() AS version");
    return { ok: true, message: row.version as string };
  } catch (e: any) {
    return { ok: false, message: e.message as string };
  }
}

export async function tableCounts() {
  const out: Record<string, number> = {};
  for (const t of ["leads", "workflow_events", "qualification_results", "sales_owners", "email_drafts"]) {
    const [r] = await q(`SELECT COUNT(*)::int AS n FROM ${t}`);
    out[t] = r.n;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Events (audit trail)
// ---------------------------------------------------------------------------
export async function addEvent(leadId: number | null, type: string, message: string, details: any = {}, status = "completed", actor = "LeadFlow AI") {
  const [r] = await q(
    `INSERT INTO workflow_events (lead_id, event_type, event_status, message, details, actor, created_at)
     VALUES ($1,$2,$3,$4,$5::jsonb,$6,NOW()) RETURNING id`,
    [leadId, type, status, message, JSON.stringify(details || {}), actor]
  );
  return r;
}

export async function listEvents(leadId?: number | null) {
  return q(
    `SELECT w.id, w.lead_id, w.event_type, w.event_status, w.message, w.details, w.actor, w.created_at,
            l.lead_reference, l.full_name AS contact_name, l.company
     FROM workflow_events w LEFT JOIN leads l ON l.id = w.lead_id
     ${leadId ? "WHERE w.lead_id = $1" : ""}
     ORDER BY w.created_at DESC LIMIT 500`,
    leadId ? [leadId] : []
  );
}

// ---------------------------------------------------------------------------
// Leads
// ---------------------------------------------------------------------------
const LEAD_SELECT = `
  SELECT l.id, l.lead_reference, l.full_name AS contact_name, l.email, l.company, l.job_title, l.website,
         l.company_size, l.industry, l.country, l.source, l.need_description AS description,
         l.budget_range AS budget, l.timeline, l.status, l.priority, l.assigned_owner_id,
         l.duplicate_of_lead_id, l.consent_to_contact, l.created_at, l.updated_at,
         s.full_name AS assigned_owner, s.email AS assigned_owner_email
  FROM leads l LEFT JOIN sales_owners s ON s.id = l.assigned_owner_id`;

export async function listLeads(search = "") {
  if (search) {
    const t = `%${search}%`;
    return q(`${LEAD_SELECT} WHERE l.full_name ILIKE $1 OR l.email ILIKE $1 OR l.company ILIKE $1 OR l.lead_reference ILIKE $1 ORDER BY l.created_at DESC`, [t]);
  }
  return q(`${LEAD_SELECT} ORDER BY l.created_at DESC`);
}

export async function getLead(id: number) {
  const rows = await q(`${LEAD_SELECT} WHERE l.id = $1`, [id]);
  return rows[0] || null;
}

export async function findDuplicates(lead: any) {
  const email = norm(lead.email), name = norm(lead.contact_name), company = norm(lead.company), site = normSite(lead.website);
  if (!email && !name) return [];
  return q(
    `SELECT id, lead_reference, full_name AS contact_name, email, company, website, status, created_at
     FROM leads WHERE
       ($1::text <> '' AND LOWER(TRIM(COALESCE(email,''))) = $1::text)
       OR ($2::text <> '' AND $3::text <> '' AND LOWER(TRIM(COALESCE(full_name,''))) = $2::text AND LOWER(TRIM(COALESCE(company,''))) = $3::text)
       OR ($2::text <> '' AND $4::text <> '' AND LOWER(TRIM(COALESCE(full_name,''))) = $2::text
           AND LOWER(REGEXP_REPLACE(REGEXP_REPLACE(COALESCE(website,''), '^https?://', ''), '^www\\.', '')) LIKE $4::text)
     ORDER BY created_at DESC LIMIT 10`,
    [email, name, company, site]
  );
}

function leadRef() {
  const d = new Date();
  const ymd = `${String(d.getUTCFullYear()).slice(2)}${String(d.getUTCMonth() + 1).padStart(2, "0")}${String(d.getUTCDate()).padStart(2, "0")}`;
  return `LF-${ymd}-${Math.random().toString(16).slice(2, 8).toUpperCase()}`;
}

export async function createLead(l: any, origin = "form") {
  const [row] = await q(
    `INSERT INTO leads (lead_reference, full_name, email, company, job_title, website, company_size, industry, country, source,
                        need_description, budget_range, timeline, status, priority, consent_to_contact, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,NOW(),NOW())
     RETURNING id, lead_reference`,
    [
      leadRef(), clean(l.contact_name), clean(l.email), clean(l.company), clean(l.job_title), clean(l.website),
      clean(l.company_size), clean(l.industry), clean(l.country), clean(l.source) || "website_form",
      clean(l.description) || "Not provided", clean(l.budget), clean(l.timeline),
      clean(l.status) || "new", normalizePriority(l.priority), !!l.consent_to_contact,
    ]
  );
  await addEvent(row.id, "lead_created", `Lead ${row.lead_reference} was created (${origin}).`, { origin, lead_reference: row.lead_reference });
  return row as { id: number; lead_reference: string };
}

export async function setStatus(id: number, status: string) {
  await q("UPDATE leads SET status=$1, updated_at=NOW() WHERE id=$2", [status, id]);
  await addEvent(id, "lead_status_updated", `Lead status changed to "${status}".`, { new_status: status }, "completed", "Administrator");
}

export async function setPriority(id: number, category: string) {
  await q("UPDATE leads SET priority=$1, updated_at=NOW() WHERE id=$2", [normalizePriority(category), id]);
}

export async function existingEmails(): Promise<Set<string>> {
  const rows = await q("SELECT LOWER(TRIM(email)) AS e FROM leads");
  return new Set(rows.map((r) => r.e));
}

// ---------------------------------------------------------------------------
// Qualification
// ---------------------------------------------------------------------------
export async function saveQualification(leadId: number, r: any, model: string) {
  const missing = Array.isArray(r.missing_information) ? r.missing_information : [String(r.missing_information || "")];
  const [row] = await q(
    `INSERT INTO qualification_results (lead_id, model_name, score, category, reasoning, missing_information, recommended_next_action, human_review_required, created_at)
     VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7,$8,NOW()) RETURNING id`,
    [leadId, model, Math.round(Number(r.score) || 0), clean(r.category) || "needs_review", clean(r.reasoning), JSON.stringify(missing), clean(r.recommended_next_action), r.human_review_required !== false]
  );
  return row;
}

export const getQualifications = (leadId: number) =>
  q("SELECT * FROM qualification_results WHERE lead_id=$1 ORDER BY created_at DESC", [leadId]);

export async function similarOutcomes(industry: string, excludeLeadId: number) {
  if (!norm(industry)) return [];
  return q(
    `SELECT qr.score, qr.category, qr.recommended_next_action, l.company_size
     FROM qualification_results qr JOIN leads l ON l.id = qr.lead_id
     WHERE LOWER(COALESCE(l.industry,'')) = $1 AND l.id <> $2
     ORDER BY qr.created_at DESC LIMIT 5`,
    [norm(industry), excludeLeadId]
  );
}

// ---------------------------------------------------------------------------
// Sales owners & assignment
// ---------------------------------------------------------------------------
export const listOwners = () =>
  q(`SELECT s.id, s.full_name, s.email, s.specialization, s.is_available, s.active_lead_limit,
            COUNT(CASE WHEN LOWER(COALESCE(l.status,'')) NOT IN ('closed','won','lost','disqualified') THEN 1 END)::int AS active_leads
     FROM sales_owners s LEFT JOIN leads l ON l.assigned_owner_id = s.id
     GROUP BY s.id ORDER BY s.full_name`);

export async function createOwner(o: any) {
  const [r] = await q(
    `INSERT INTO sales_owners (full_name, email, specialization, is_available, active_lead_limit, created_at)
     VALUES ($1,$2,$3,TRUE,$4,NOW()) RETURNING id`,
    [clean(o.full_name), clean(o.email), clean(o.specialization), Number(o.active_lead_limit) || 10]
  );
  return r;
}

export const setOwnerAvailability = (id: number, available: boolean) =>
  q("UPDATE sales_owners SET is_available=$1 WHERE id=$2", [!!available, id]);

export async function assignAuto(leadId: number) {
  const lead = await getLead(leadId);
  if (!lead) return { ok: false, message: "Lead not found.", owner: null };
  const industry = clean(lead.industry) || "unspecified industry";
  const owners = (await listOwners()).filter((o) => o.is_available);
  const eligible = owners.filter((o) => o.active_leads < o.active_lead_limit);
  if (!eligible.length) return { ok: false, message: "No available sales owner has remaining capacity.", owner: null };

  const terms = (s: string) => norm(s).split(/[,;/|]+/).map((x) => x.trim()).filter(Boolean);
  const GENERAL = ["general business", "general", "all industries", "all", "any", "*"];
  let candidates = eligible.filter((o) => norm(lead.industry) && terms(o.specialization).includes(norm(lead.industry)));
  let reason = "exact_industry_match";
  if (!candidates.length) {
    candidates = eligible.filter((o) => GENERAL.includes(norm(o.specialization)));
    reason = "general_business_fallback";
  }
  if (!candidates.length) {
    return { ok: false, message: `No available owner matches "${industry}" or has a General Business specialization. Lead left unassigned for manual assignment.`, owner: null };
  }
  candidates.sort((a, b) => a.active_leads / Math.max(a.active_lead_limit, 1) - b.active_leads / Math.max(b.active_lead_limit, 1) || a.active_leads - b.active_leads);
  const sel = candidates[0];
  await q("UPDATE leads SET assigned_owner_id=$1, updated_at=NOW() WHERE id=$2", [sel.id, leadId]);
  await addEvent(leadId, "automatic_owner_assignment", `Lead assigned automatically to ${sel.full_name}.`, {
    owner_id: sel.id, owner_name: sel.full_name, specialization: sel.specialization, lead_industry: industry, assignment_reason: reason,
  });
  return { ok: true, message: `Assigned to ${sel.full_name} (${reason === "exact_industry_match" ? "exact industry match" : "General Business fallback"}).`, owner: sel };
}

export async function assignManual(leadId: number, ownerId: number | null) {
  await q("UPDATE leads SET assigned_owner_id=$1, updated_at=NOW() WHERE id=$2", [ownerId, leadId]);
  const owner = ownerId ? (await listOwners()).find((o) => o.id === ownerId) : null;
  await addEvent(leadId, ownerId ? "manual_owner_assignment" : "owner_unassigned",
    ownerId ? `Lead assigned manually to ${owner?.full_name}.` : "Lead owner was removed.", { owner_id: ownerId }, "completed", "Administrator");
}

// ---------------------------------------------------------------------------
// Email drafts (never sent — review & approval only)
// ---------------------------------------------------------------------------
export const listDrafts = (leadId?: number) =>
  q(`SELECT e.id, e.lead_id, e.recipient_email, e.subject, e.body, e.draft_status, e.approved_by, e.approved_at, e.created_at, e.updated_at,
            l.lead_reference, l.full_name AS contact_name, l.company
     FROM email_drafts e LEFT JOIN leads l ON l.id = e.lead_id
     ${leadId ? "WHERE e.lead_id = $1" : ""} ORDER BY e.created_at DESC`, leadId ? [leadId] : []);

export async function saveDraft(leadId: number, recipient: string, subject: string, body: string, draftId?: number) {
  if (!clean(recipient) || !clean(subject) || !clean(body)) throw new Error("Recipient, subject and body are required.");
  let id: number, type: string, msg: string;
  if (draftId) {
    const rows = await q(
      `UPDATE email_drafts SET recipient_email=$1, subject=$2, body=$3, draft_status='pending_review', approved_by=NULL, approved_at=NULL, updated_at=NOW()
       WHERE id=$4 AND lead_id=$5 RETURNING id`, [clean(recipient), clean(subject), clean(body), draftId, leadId]);
    if (!rows.length) throw new Error("Draft not found.");
    id = rows[0].id; type = "email_draft_updated"; msg = "Follow-up email draft was updated.";
  } else {
    const [r] = await q(
      `INSERT INTO email_drafts (lead_id, recipient_email, subject, body, draft_status, created_at, updated_at)
       VALUES ($1,$2,$3,$4,'pending_review',NOW(),NOW()) RETURNING id`, [leadId, clean(recipient), clean(subject), clean(body)]);
    id = r.id; type = "email_draft_created"; msg = "A new follow-up email draft was saved.";
  }
  await addEvent(leadId, type, msg, { email_draft_id: id, recipient_email: clean(recipient), subject: clean(subject) });
  return id;
}

export async function approveDraft(id: number, by = "Administrator") {
  const rows = await q(
    `UPDATE email_drafts SET draft_status='approved', approved_by=$1, approved_at=NOW(), updated_at=NOW() WHERE id=$2 RETURNING lead_id, subject`, [by, id]);
  if (!rows.length) throw new Error("Draft not found.");
  await addEvent(rows[0].lead_id, "email_draft_approved", "Follow-up email draft was approved. No email was sent.", { email_draft_id: id, approved_by: by, subject: rows[0].subject }, "completed", by);
}

export async function deleteDraft(id: number) {
  const rows = await q("DELETE FROM email_drafts WHERE id=$1 RETURNING lead_id", [id]);
  if (rows.length) await addEvent(rows[0].lead_id, "email_draft_deleted", "Follow-up email draft was deleted.", { email_draft_id: id }, "completed", "Administrator");
}

// ---------------------------------------------------------------------------
// Dashboard statistics
// ---------------------------------------------------------------------------
export async function stats() {
  const [totals, byStatus, byPriority, bySource, daily, qual, drafts, byCategory] = await Promise.all([
    q(`SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE assigned_owner_id IS NULL)::int AS unassigned,
              COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days')::int AS last7 FROM leads`),
    q("SELECT COALESCE(status,'new') AS k, COUNT(*)::int AS n FROM leads GROUP BY 1 ORDER BY n DESC"),
    q("SELECT COALESCE(priority,'unassessed') AS k, COUNT(*)::int AS n FROM leads GROUP BY 1"),
    q("SELECT COALESCE(NULLIF(source,''),'unknown') AS k, COUNT(*)::int AS n FROM leads GROUP BY 1 ORDER BY n DESC"),
    q(`SELECT to_char(d::date,'YYYY-MM-DD') AS day, COALESCE(c.n,0)::int AS n
       FROM generate_series(CURRENT_DATE - 29, CURRENT_DATE, '1 day') d
       LEFT JOIN (SELECT created_at::date AS day, COUNT(*) AS n FROM leads GROUP BY 1) c ON c.day = d::date ORDER BY d`),
    q("SELECT COUNT(*)::int AS n, COALESCE(ROUND(AVG(score)),0)::int AS avg FROM qualification_results"),
    q("SELECT COUNT(*) FILTER (WHERE draft_status='pending_review')::int AS pending, COUNT(*) FILTER (WHERE draft_status='approved')::int AS approved FROM email_drafts"),
    q(`SELECT category AS k, COUNT(*)::int AS n FROM (SELECT DISTINCT ON (lead_id) lead_id, category FROM qualification_results ORDER BY lead_id, created_at DESC) t GROUP BY 1`),
  ]);
  return { ...totals[0], byStatus, byPriority, bySource, daily, qualified: qual[0], drafts: drafts[0], byCategory };
}
