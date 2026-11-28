"use client";
import { useRef, useState } from "react";
import { api } from "@/lib/client";
import { FIELD_LABELS, mapRows, parseCsv } from "@/lib/csv";
import { Alert, Modal, Spinner } from "./ui";
import BatchPanel, { BatchItem } from "./BatchPanel";

const SAMPLE = "name,email,company,job title,website,industry,company size,country,source,budget,timeline,consent to contact,description\nJane Doe,jane@example.com,Example Co,COO,example.com,SaaS,50-200,Pakistan,linkedin,$10k,Q1,yes,Needs a CRM to track inbound leads";

export default function CsvImport({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [file, setFile] = useState("");
  const [parsed, setParsed] = useState<{ map: Record<string, number>; rows: any[] } | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [runAi, setRunAi] = useState(true);
  const [batch, setBatch] = useState<BatchItem[] | null>(null);

  const reset = () => { setFile(""); setParsed(null); setError(""); setResult(null); setBusy(false); setBatch(null); };
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
    try {
      const r = await api("/api/leads/import", { method: "POST", body: { rows: parsed.rows } });
      setResult(r); onDone();
      if (runAi && r.created?.length) setBatch(r.created);
    }
    catch (e: any) { setError(e.message); }
    setBusy(false);
  }

  return (
    <Modal open={open} onClose={close} title="Import leads from CSV" wide>
      {result ? (
        <div className="space-y-4">
          <Alert kind="ok"><b>{result.imported}</b> imported · {result.duplicates} duplicate email(s) skipped · {result.invalid} invalid row(s)</Alert>
          {result.problems?.length > 0 && <ul className="list-disc pl-5 text-sm text-onyx/70">{result.problems.map((p: string) => <li key={p}>{p}</li>)}</ul>}
          {batch && <BatchPanel items={batch} onFinished={onDone} />}
          <div className="flex gap-2"><button className="btn-accent" onClick={close}>{batch ? "Close" : "Done"}</button><button className="btn-ghost" onClick={reset}>Import another</button></div>
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
              <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-chalk-3 bg-white p-3.5 text-sm">
                <input type="checkbox" className="mt-0.5 h-4 w-4 accent-tangerine" checked={runAi} onChange={(e) => setRunAi(e.target.checked)} />
                <span><b>Run the AI workflow on every imported lead</b><br /><span className="text-xs text-onyx/55">Qualify → route → assign an owner → draft the follow-up email. About 10–20 seconds per lead; keep this window open until it finishes.</span></span>
              </label>
              <div className="flex items-center justify-between">
                <span className="text-sm text-onyx/60">{parsed.rows.length} row(s) ready</span>
                <button className="btn-accent" disabled={busy} onClick={submit}>{busy ? <><Spinner /> Importing…</> : runAi ? `Import & run AI on ${parsed.rows.length}` : `Import ${parsed.rows.length} leads`}</button>
              </div>
            </>
          )}
        </div>
      )}
    </Modal>
  );
}
