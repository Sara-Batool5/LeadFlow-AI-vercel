"use client";
import { useRef, useState } from "react";
import { api } from "@/lib/client";
import { FIELD_LABELS, mapRows, parseCsv } from "@/lib/csv";
import { Alert, Modal, Spinner } from "./ui";

const SAMPLE = "name,email,company,job title,industry,company size,country,source,budget,timeline,description\nJane Doe,jane@example.com,Example Co,COO,SaaS,50-200,Pakistan,linkedin,$10k,Q1,Needs a CRM to track inbound leads";

export default function CsvImport({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [file, setFile] = useState("");
  const [parsed, setParsed] = useState<{ map: Record<string, number>; rows: any[] } | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<any>(null);

  const reset = () => { setFile(""); setParsed(null); setError(""); setResult(null); setBusy(false); };
  const close = () => { reset(); onClose(); };

  async function read(f?: File) {
    if (!f) return;
    reset(); setFile(f.name);
    if (!/\.csv$|\.txt$/i.test(f.name) && f.type !== "text/csv") return setError("Please choose a .csv file (in Excel: File → Save As → CSV).");
    const p = mapRows(parseCsv(await f.text()));
    if (p.map.contact_name === undefined || p.map.email === undefined) return setError("Could not find a Name column and an Email column in the header row.");
    if (!p.rows.length) return setError("The file has a header row but no data rows.");
    setParsed(p);
  }

  async function submit() {
    if (!parsed) return;
    setBusy(true); setError("");
    try { const r = await api("/api/leads/import", { method: "POST", body: { rows: parsed.rows } }); setResult(r); onDone(); }
    catch (e: any) { setError(e.message); }
    setBusy(false);
  }

  return (
    <Modal open={open} onClose={close} title="Import leads from CSV" wide>
      {result ? (
        <div className="space-y-4">
          <Alert kind="ok"><b>{result.imported}</b> imported · {result.duplicates} duplicate email(s) skipped · {result.invalid} invalid row(s)</Alert>
          {result.problems?.length > 0 && <ul className="list-disc pl-5 text-sm text-onyx/70">{result.problems.map((p: string) => <li key={p}>{p}</li>)}</ul>}
          <div className="flex gap-2"><button className="btn-accent" onClick={close}>Done</button><button className="btn-ghost" onClick={reset}>Import another</button></div>
        </div>
      ) : (
        <div className="space-y-4">
          <div
            onClick={() => input.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
            onDrop={(e) => { e.preventDefault(); setDrag(false); read(e.dataTransfer.files[0]); }}
            className={`cursor-pointer rounded-3xl border-2 border-dashed p-10 text-center transition-all ${drag ? "scale-[1.01] border-tangerine bg-tangerine-soft" : "border-chalk-3 bg-white hover:border-tangerine"}`}>
            <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-tangerine text-xl">⬆</div>
            <div className="font-bold">{file || "Drop a CSV here or click to browse"}</div>
            <div className="mt-1 text-xs text-onyx/55">Needs Name and Email columns · up to 200 rows per import · existing emails are skipped</div>
            <input ref={input} type="file" accept=".csv,text/csv" hidden onChange={(e) => read(e.target.files?.[0])} />
          </div>
          <a className="inline-block text-xs font-semibold text-tangerine-dark underline" href={`data:text/csv;charset=utf-8,${encodeURIComponent(SAMPLE)}`} download="leadflow-sample.csv">Download a sample CSV</a>
          {error && <Alert>{error}</Alert>}
          {parsed && (
            <>
              <div className="flex flex-wrap gap-1.5">
                {Object.keys(FIELD_LABELS).map((f) => (
                  <span key={f} className={`chip ${parsed.map[f] !== undefined ? "bg-emerald-100 text-emerald-800" : "bg-chalk-2 text-onyx/45"}`}>{parsed.map[f] !== undefined ? "✓" : "–"} {FIELD_LABELS[f]}</span>
                ))}
              </div>
              <div className="overflow-auto rounded-2xl border border-chalk-3 bg-white">
                <table className="w-full text-xs"><thead><tr>{["contact_name", "email", "company", "industry"].map((f) => <th key={f} className="th">{FIELD_LABELS[f]}</th>)}</tr></thead>
                  <tbody>{parsed.rows.slice(0, 5).map((r, i) => <tr key={i} className="border-t border-chalk-2">{["contact_name", "email", "company", "industry"].map((f) => <td key={f} className="px-4 py-2">{r[f] || "—"}</td>)}</tr>)}</tbody></table>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-onyx/60">{parsed.rows.length} row(s) ready</span>
                <button className="btn-accent" disabled={busy} onClick={submit}>{busy ? <><Spinner /> Importing…</> : `Import ${parsed.rows.length} leads`}</button>
              </div>
            </>
          )}
        </div>
      )}
    </Modal>
  );
}
