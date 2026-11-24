"use client";
import { useState } from "react";
import { api, fmtDate } from "@/lib/client";
import { Alert, Modal, Spinner } from "./ui";
import StageList from "./StageList";

const EMPTY = { contact_name: "", email: "", company: "", job_title: "", website: "", industry: "", company_size: "", country: "", source: "website_form", budget: "", timeline: "", description: "", consent_to_contact: false };
const SOURCES = ["website_form", "linkedin", "referral", "cold_email", "webinar", "event", "other"];

export default function LeadForm({ open, onClose, onDone, onOpenLead }: { open: boolean; onClose: () => void; onDone: () => void; onOpenLead: (id: number) => void }) {
  const [f, setF] = useState<any>(EMPTY);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [dupes, setDupes] = useState<any[] | null>(null);
  const [run, setRun] = useState<any>(null);

  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value });
  const close = () => { setF(EMPTY); setError(""); setDupes(null); setRun(null); setBusy(""); onClose(); };

  async function save(allowDuplicate = false) {
    setBusy("save"); setError("");
    try {
      const r = await api("/api/leads", { method: "POST", body: { lead: f, allowDuplicate } });
      onDone(); close(); onOpenLead(r.id);
    } catch (e: any) {
      if (e.status === 409) setDupes(e.data.matches); else setError(e.message);
    }
    setBusy("");
  }

  async function workflow(allowDuplicate = false) {
    setBusy("flow"); setError("");
    try {
      const r = await api("/api/workflow", { method: "POST", body: { leadData: f, allowDuplicate } });
      if (r.route === "duplicate_review") setDupes(r.matches); else { setDupes(null); setRun(r); onDone(); }
    } catch (e: any) { setError(e.message); }
    setBusy("");
  }

  const field = (k: string, label: string, ph = "") => (
    <div><label className="label">{label}</label><input className="input" placeholder={ph} value={f[k]} onChange={set(k)} /></div>
  );

  if (run) {
    return (
      <Modal open={open} onClose={close} title="Workflow result" wide>
        {run.error && <div className="mb-3"><Alert>{run.error}</Alert></div>}
        <StageList stages={run.stages} />
        <div className="mt-5 flex gap-2">
          {run.leadId && <button className="btn-accent" onClick={() => { const id = run.leadId; close(); onOpenLead(id); }}>Open lead</button>}
          <button className="btn-ghost" onClick={close}>Close</button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal open={open} onClose={close} title="Create lead" wide>
      <div className="grid gap-4 sm:grid-cols-2">
        {field("contact_name", "Contact name *", "Jane Doe")}
        {field("email", "Email *", "jane@company.com")}
        {field("company", "Company")}
        {field("job_title", "Job title")}
        {field("website", "Website", "company.com")}
        {field("industry", "Industry", "e.g. Healthcare")}
        {field("company_size", "Company size", "e.g. 50-200")}
        {field("country", "Country")}
        <div><label className="label">Source</label><select className="input" value={f.source} onChange={set("source")}>{SOURCES.map((s) => <option key={s}>{s}</option>)}</select></div>
        {field("budget", "Budget")}
        {field("timeline", "Timeline", "e.g. next quarter")}
        <div className="sm:col-span-2"><label className="label">Business need</label><textarea className="input min-h-24" value={f.description} onChange={set("description")} /></div>
        <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" className="h-4 w-4 accent-tangerine" checked={f.consent_to_contact} onChange={set("consent_to_contact")} /> The lead consented to be contacted</label>
      </div>
      {error && <div className="mt-4"><Alert>{error}</Alert></div>}
      {dupes && (
        <div className="mt-4 space-y-2">
          <Alert kind="info"><b>Possible duplicate(s) found.</b> Check before creating another record:</Alert>
          {dupes.map((d) => <div key={d.id} className="rounded-2xl bg-white p-3 text-sm"><b>{d.contact_name}</b> · {d.email} · {d.company || "—"} <span className="text-onyx/50">({d.lead_reference}, {fmtDate(d.created_at)})</span></div>)}
          <div className="flex gap-2"><button className="btn-dark btn-sm" onClick={() => (busy ? null : save(true))}>Create anyway</button><button className="btn-ghost btn-sm" onClick={() => workflow(true)}>Create anyway + run AI</button></div>
        </div>
      )}
      <div className="mt-6 flex flex-wrap justify-end gap-2">
        <button className="btn-ghost" onClick={close}>Cancel</button>
        <button className="btn-dark" disabled={!!busy} onClick={() => save()}>{busy === "save" ? <Spinner /> : "Save lead"}</button>
        <button className="btn-accent" disabled={!!busy} onClick={() => workflow()}>{busy === "flow" ? <><Spinner /> Running agents…</> : "⚡ Save & run AI workflow"}</button>
      </div>
    </Modal>
  );
}
