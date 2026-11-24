import { handle } from "@/lib/api";
import { addEvent, createLead, existingEmails } from "@/lib/db";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_ROWS = 200;

// Receives rows already mapped to LeadFlow fields by the browser (see lib/csv.ts).
export const POST = handle(async (req) => {
  const { rows } = await req.json();
  if (!Array.isArray(rows) || !rows.length) throw new Error("The file has no rows to import.");
  if (rows.length > MAX_ROWS) throw new Error(`Please import at most ${MAX_ROWS} rows at a time (this file has ${rows.length}).`);

  const seen = await existingEmails();
  let imported = 0, duplicates = 0, invalid = 0;
  const problems: string[] = [];

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const email = String(r.email || "").trim().toLowerCase();
    if (!String(r.contact_name || "").trim() || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      invalid++; if (problems.length < 5) problems.push(`Row ${i + 2}: needs a name and a valid email.`); continue;
    }
    if (seen.has(email)) { duplicates++; continue; }
    await createLead({ ...r, email, source: r.source || "csv_import" }, "csv_import");
    seen.add(email); imported++;
  }
  await addEvent(null, "csv_import_completed", `CSV import finished: ${imported} imported, ${duplicates} duplicates skipped, ${invalid} invalid.`, { imported, duplicates, invalid, total: rows.length });
  return { imported, duplicates, invalid, total: rows.length, problems };
});
