// Small dependency-free CSV parser + header mapper (runs in the browser).
export function parseCsv(text: string): string[][] {
  const rows: string[][] = []; let row: string[] = [], cell = "", q = false;
  const s = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (q) {
      if (c === '"' && s[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') q = false;
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && s[i + 1] === "\n") i++;
      row.push(cell); cell = "";
      if (row.some((x) => x.trim() !== "")) rows.push(row);
      row = [];
    } else cell += c;
  }
  row.push(cell);
  if (row.some((x) => x.trim() !== "")) rows.push(row);
  return rows;
}

const ALIASES: Record<string, string[]> = {
  contact_name: ["name", "full name", "fullname", "contact", "contact name", "lead name", "first name"],
  email: ["email", "e-mail", "email address", "work email"],
  company: ["company", "company name", "organization", "organisation", "account"],
  job_title: ["job title", "title", "position", "role"],
  website: ["website", "url", "domain", "company website", "site"],
  industry: ["industry", "sector", "vertical"],
  company_size: ["company size", "size", "employees", "headcount", "team size"],
  country: ["country", "location", "region"],
  source: ["source", "lead source", "channel", "origin"],
  budget: ["budget", "budget range"],
  timeline: ["timeline", "timeframe", "purchase timeline"],
  consent_to_contact: ["consent", "consent to contact", "consent to be contacted", "contact consent", "opt in", "opted in"],
  description: ["description", "need", "needs", "business need", "notes", "requirement", "message", "inquiry"],
};
export const FIELD_LABELS: Record<string, string> = {
  contact_name: "Name", email: "Email", company: "Company", job_title: "Job title", website: "Website", industry: "Industry",
  company_size: "Company size", country: "Country", source: "Source", budget: "Budget", timeline: "Timeline", consent_to_contact: "Consent", description: "Business need",
};

export function mapRows(table: string[][]) {
  const [header, ...body] = table;
  const norm = (h: string) => h.trim().toLowerCase().replace(/[_-]+/g, " ");
  const map: Record<string, number> = {};
  Object.entries(ALIASES).forEach(([field, names]) => {
    const idx = header.findIndex((h) => names.includes(norm(h)));
    if (idx >= 0) map[field] = idx;
  });
  const rows = body.map((r) => {
    const o: any = {};
    Object.entries(map).forEach(([f, i]) => (o[f] = (r[i] || "").trim()));
    if ("consent_to_contact" in o) o.consent_to_contact = /^(yes|y|true|1|consent|consented|opted in)$/i.test(String(o.consent_to_contact).trim());
    return o;
  });
  return { map, rows };
}
