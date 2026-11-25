import { allowedStatuses, mapStatus, q } from "./db";
import { hashPassword } from "./password";

const g = globalThis as any;

// Creates the accounts table and adds a workspace column to the existing tables (safe to run repeatedly).
export function ensureSchema(): Promise<void> {
  if (!g.__lfSchema) {
    g.__lfSchema = (async () => {
      await q(`CREATE TABLE IF NOT EXISTS app_users (
        id SERIAL PRIMARY KEY, email TEXT UNIQUE NOT NULL, name TEXT NOT NULL, password_hash TEXT NOT NULL,
        is_demo BOOLEAN NOT NULL DEFAULT FALSE, seeded_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
      await q(`CREATE TABLE IF NOT EXISTS login_attempts (
        id BIGSERIAL PRIMARY KEY, kind TEXT NOT NULL, key TEXT NOT NULL, ok BOOLEAN NOT NULL DEFAULT FALSE, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
      try { await q("CREATE INDEX IF NOT EXISTS idx_login_attempts_lookup ON login_attempts (kind, key, created_at)"); } catch {}
      for (const t of ["leads", "sales_owners", "workflow_events"]) {
        try { await q(`ALTER TABLE ${t} ADD COLUMN IF NOT EXISTS workspace_id INTEGER`); } catch {}
      }
      for (const t of ["leads", "sales_owners", "workflow_events"]) {
        try { await q(`CREATE INDEX IF NOT EXISTS idx_${t}_workspace ON ${t} (workspace_id)`); } catch {}
      }
    })().catch((e) => { g.__lfSchema = null; throw e; });
  }
  return g.__lfSchema;
}

export type User = { id: number; email: string; name: string; password_hash: string; is_demo: boolean; seeded_at: string | null };

export async function findUser(email: string): Promise<User | null> {
  return (await q("SELECT * FROM app_users WHERE email=$1", [email]))[0] || null;
}

export async function createUser(email: string, name: string, password: string, demo = false): Promise<User> {
  return (await q(
    `INSERT INTO app_users (email, name, password_hash, is_demo) VALUES ($1,$2,$3,$4)
     ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name RETURNING *`,
    [email, name, hashPassword(password), demo]))[0];
}

// The admin (ADMIN_EMAIL + APP_PASSWORD) takes over leads created before accounts existed.
export async function claimLegacyData(ws: number) {
  for (const t of ["leads", "sales_owners", "workflow_events"]) {
    await q(`UPDATE ${t} SET workspace_id=$1 WHERE workspace_id IS NULL`, [ws]);
  }
}

// ---------------------------------------------------------------------------
// Demo workspace (shared sandbox with sample data, refreshed every few hours)
// ---------------------------------------------------------------------------
const DEMO_EMAIL = "demo@leadflow.app";

export async function ensureDemo(): Promise<User> {
  let u = await findUser(DEMO_EMAIL);
  if (!u) u = await createUser(DEMO_EMAIL, "Demo visitor", Math.random().toString(36) + Date.now(), true);
  const stale = !u.seeded_at || Date.now() - new Date(u.seeded_at).getTime() > 6 * 3600_000;
  if (stale) { await seedDemo(u.id); await q("UPDATE app_users SET seeded_at=NOW() WHERE id=$1", [u.id]); }
  return u;
}

const OWNERS = [
  ["Ayesha Khan", "ayesha@demo.leadflow.app", "Healthcare, Biotechnology", 8],
  ["Daniel Roberts", "daniel@demo.leadflow.app", "SaaS, Fintech", 8],
  ["Maria Lopez", "maria@demo.leadflow.app", "General Business", 12],
] as const;

// name, company, title, industry, size, country, source, status, daysAgo, score|null, category, owner index|null
const LEADS: any[] = [
  ["Sophia Bennett", "Northwind Labs", "VP of Marketing", "SaaS", "50-200", "USA", "linkedin", "qualified", 2, 88, "high_fit", 1],
  ["Marcus Lee", "Brightpath", "Head of Sales", "SaaS", "200-500", "UK", "website_form", "assigned", 3, 76, "medium_fit", 1],
  ["Aisha Karim", "Helio Systems", "Operations Director", "Fintech", "100-250", "UAE", "referral", "in progress", 4, 91, "high_fit", 1],
  ["Daniel Ortiz", "Corelane", "CTO", "SaaS", "20-50", "Spain", "linkedin", "new", 5, null, null, null],
  ["Emma Schultz", "Mapleworks", "Procurement Lead", "Manufacturing", "500+", "Germany", "webinar", "contacted", 6, 58, "medium_fit", 2],
  ["Raj Patel", "Tidefront", "Founder", "Logistics", "10-20", "India", "cold_email", "new", 8, 32, "low_fit", null],
  ["Lena Fischer", "Quanta Health", "COO", "Healthcare", "200-500", "Germany", "website_form", "qualified", 9, 84, "high_fit", 0],
  ["Omar Haddad", "Arcwell Group", "Director", "Biotechnology", "50-100", "UAE", "linkedin", "assigned", 12, 79, "medium_fit", 0],
  ["Chloe Martin", "Loomstack", "Marketing Manager", "Retail", "10-50", "France", "website_form", "new", 14, null, null, null],
  ["Noah Williams", "Vantage Freight", "Operations Manager", "Logistics", "100-200", "USA", "referral", "won", 17, 86, "high_fit", 2],
  ["Priya Nair", "Luminary Care", "Clinic Director", "Healthcare", "20-50", "India", "event", "needs_review", 20, 45, "needs_review", null],
  ["Ethan Brooks", "StackEd Lab", "Product Lead", "SaaS", "50-100", "Canada", "website_form", "lost", 25, 30, "low_fit", 1],
];
const EXTRA_NAMES = ["Zara Ahmed", "Liam Chen", "Nora Silva", "Yusuf Demir", "Hana Sato", "Oscar Novak", "Mia Rossi", "Idris Bello"];
const EXTRA_CO = ["Greenfield Co", "Pixelwave", "Atlas Dental", "Brightleaf", "Nimbus Cloud", "Harbor Foods", "Kestrel Bio", "Orbit Pay"];
const EXTRA_IND = ["Retail", "SaaS", "Healthcare", "Retail", "SaaS", "Manufacturing", "Biotechnology", "Fintech"];
const EXTRA_SRC = ["website_form", "linkedin", "website_form", "referral", "website_form", "webinar", "website_form", "website_form"];
const EXTRA_DAYS = [1, 1, 3, 5, 5, 7, 10, 22];

async function seedDemo(ws: number) {
  await q("DELETE FROM workflow_events WHERE workspace_id=$1 OR lead_id IN (SELECT id FROM leads WHERE workspace_id=$1)", [ws]);
  await q("DELETE FROM email_drafts WHERE lead_id IN (SELECT id FROM leads WHERE workspace_id=$1)", [ws]);
  await q("DELETE FROM qualification_results WHERE lead_id IN (SELECT id FROM leads WHERE workspace_id=$1)", [ws]);
  await q("DELETE FROM leads WHERE workspace_id=$1", [ws]);
  await q("DELETE FROM sales_owners WHERE workspace_id=$1", [ws]);

  const ownerIds: number[] = [];
  for (const [n, e, s, l] of OWNERS) {
    ownerIds.push((await q(`INSERT INTO sales_owners (full_name, email, specialization, is_available, active_lead_limit, workspace_id, created_at)
      VALUES ($1,$2,$3,TRUE,$4,$5,NOW()) RETURNING id`, [n, e, s, l, ws]))[0].id);
  }
  const all = [...LEADS, ...EXTRA_NAMES.map((n, i) => [n, EXTRA_CO[i], "Manager", EXTRA_IND[i], "20-100", "USA", EXTRA_SRC[i], "new", EXTRA_DAYS[i], null, null, null])];
  const allowed = await allowedStatuses();
  const pendingDraftFor = new Set(["Sophia Bennett", "Aisha Karim", "Lena Fischer"]);

  for (let i = 0; i < all.length; i++) {
    const [name, co, title, ind, size, country, src, status, days, score, cat, own] = all[i];
    const email = `${name.toLowerCase().replace(/[^a-z]+/g, ".")}@${co.toLowerCase().replace(/[^a-z]+/g, "")}.com`;
    const prio = cat === "high_fit" ? "high" : cat === "medium_fit" ? "medium" : cat === "low_fit" ? "low" : "unassessed";
    const lead = (await q(
      `INSERT INTO leads (lead_reference, full_name, email, company, job_title, website, company_size, industry, country, source, need_description,
                          budget_range, timeline, status, priority, assigned_owner_id, consent_to_contact, workspace_id, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,TRUE,$17, NOW() - make_interval(days => $18, hours => $19), NOW())
       RETURNING id`,
      [`LF-DEMO-${String(i + 1).padStart(3, "0")}`, name, email, co, title, `${co.toLowerCase().replace(/[^a-z]+/g, "")}.com`, size, ind, country, src,
       `Looking for a better way to handle inbound ${ind.toLowerCase()} inquiries and follow up faster.`, "$10k-$50k", "This quarter", mapStatus(status, allowed), prio,
       own === null ? null : ownerIds[own], ws, days, (i * 5) % 20]))[0];
    await q(`INSERT INTO workflow_events (lead_id, event_type, event_status, message, details, actor, workspace_id, created_at)
             VALUES ($1,'lead_created','completed',$2,'{}'::jsonb,'Demo seed',$3, NOW() - make_interval(days => $4, hours => $5))`,
      [lead.id, `Lead ${name} was created (demo data).`, ws, days, (i * 5) % 20]);
    if (score !== null) {
      const reasoning = cat === "high_fit" ? "Clear need, relevant industry and a defined timeline." : cat === "medium_fit" ? "Reasonable fit, but budget and decision process are unclear." : cat === "low_fit" ? "Limited fit with the current offering." : "Not enough information for a reliable decision.";
      const next = cat === "high_fit" ? "Book a discovery call this week." : cat === "needs_review" ? "Ask for company size and budget before routing." : "Send an information request and re-assess.";
      await q(`INSERT INTO qualification_results (lead_id, model_name, score, category, reasoning, missing_information, recommended_next_action, human_review_required, created_at)
               VALUES ($1,'demo-seed',$2,$3,$4,$5::jsonb,$6,$7, NOW() - make_interval(days => $8))`,
        [lead.id, score, cat, reasoning, JSON.stringify(cat === "high_fit" ? [] : ["Budget confirmation"]), next, cat !== "high_fit", days]);
      await q(`INSERT INTO workflow_events (lead_id, event_type, event_status, message, details, actor, workspace_id, created_at)
               VALUES ($1,'ai_qualification_completed','completed','AI lead qualification completed.',$2::jsonb,'Demo seed',$3, NOW() - make_interval(days => $4))`,
        [lead.id, JSON.stringify({ score, category: cat }), ws, days]);
      const route = cat === "high_fit" ? "prioritize_sales" : cat === "needs_review" ? "human_review" : cat === "medium_fit" ? "request_information" : "hold_low_fit";
      await q(`INSERT INTO workflow_events (lead_id, event_type, event_status, message, details, actor, workspace_id, created_at)
               VALUES ($1,'ai_decision_made','completed',$2,$3::jsonb,'Demo seed',$4, NOW() - make_interval(days => $5))`,
        [lead.id, `AI decision: ${route}.`, JSON.stringify({ decision_category: route, reasoning, next_action: next }), ws, days]);
    }
    if (pendingDraftFor.has(name) || name === "Noah Williams") {
      const approved = name === "Noah Williams";
      await q(`INSERT INTO email_drafts (lead_id, recipient_email, subject, body, draft_status, approved_by, approved_at, created_at, updated_at)
               VALUES ($1,$2,$3,$4,$5,$6,$7,NOW(),NOW())`,
        [lead.id, email, `Following up on your inquiry, ${name.split(" ")[0]}`,
         `Hi ${name.split(" ")[0]},\n\nThanks for getting in touch about ${ind.toLowerCase()} lead handling at ${co}. Based on what you shared, I'd like to learn a little more about your current process and timeline.\n\nWould you be open to a short call this week?\n\nBest regards`,
         approved ? "approved" : "pending_review", approved ? "Demo visitor" : null, approved ? new Date() : null]);
    }
  }
}
