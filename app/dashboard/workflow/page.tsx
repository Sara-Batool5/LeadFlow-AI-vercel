"use client";
import { useState } from "react";
import { Alert, Badge, PageHeader, Spinner } from "@/components/ui";
import { useShell } from "@/components/Shell";
import StageList from "@/components/StageList";
import { api, useApi } from "@/lib/client";

const IDLE = ["Intake Validation", "Duplicate Detection", "Lead Creation", "AI Qualification", "Memory Retrieval", "AI Decision", "Owner Assignment", "Email Draft"].map((label, i) => ({ key: String(i), label, status: "waiting" as const, detail: "" }));

export default function Workflow() {
  const { openCreate, openLead, bump } = useShell();
  const leads = useApi<any[]>("/api/leads");
  const [leadId, setLeadId] = useState("");
  const [run, setRun] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [requalify, setRequalify] = useState(true);
  const [error, setError] = useState("");

  async function go() {
    setBusy(true); setError(""); setRun(null);
    try { setRun(await api("/api/workflow", { method: "POST", body: { leadId: Number(leadId), requalify } })); bump(); } catch (e: any) { setError(e.message); }
    setBusy(false);
  }

  return (
    <>
      <PageHeader title="Agent Workflow" subtitle="Run the 8-agent pipeline on a new or existing lead. Nothing is ever emailed automatically.">
        <button className="btn-dark" onClick={openCreate}>+ New lead & run workflow</button>
      </PageHeader>
      <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
        <div className="space-y-4">
          <div className="card p-6">
            <h2 className="mb-1 text-lg font-bold">Run on an existing lead</h2>
            <p className="mb-4 text-xs text-onyx/55">Runs qualification, routing, owner assignment and the email draft.</p>
            <select className="input" value={leadId} onChange={(e) => setLeadId(e.target.value)}>
              <option value="">Select a lead…</option>
              {(leads.data || []).map((l) => <option key={l.id} value={l.id}>{l.contact_name} — {l.company || l.email}</option>)}
            </select>
            <label className="mt-3 flex cursor-pointer items-start gap-2 text-xs text-onyx/70"><input type="checkbox" className="mt-0.5 h-4 w-4 accent-tangerine" checked={requalify} onChange={(e) => setRequalify(e.target.checked)} /><span>Re-run AI qualification (ignore any saved score)</span></label>
            <button className="btn-accent mt-4 w-full" disabled={!leadId || busy} onClick={go}>{busy ? <><Spinner /> Agents working…</> : "⚡ Run workflow"}</button>
          </div>
          {run?.decision && (
            <div className="card-dark animate-fadeUp p-6">
              <div className="text-xs font-bold uppercase tracking-wide text-tangerine">AI decision</div>
              <div className="mt-1 text-2xl font-extrabold capitalize">{run.decision.decision_category.replace(/_/g, " ")}</div>
              <p className="mt-2 text-sm text-chalk/75">{run.decision.reasoning}</p>
              <p className="mt-3 rounded-2xl bg-white/10 p-3 text-sm">{run.decision.next_action}</p>
              {run.leadId && <button className="btn-accent btn-sm mt-4" onClick={() => openLead(run.leadId)}>Open lead</button>}
            </div>
          )}
        </div>
        <div className="card p-6">
          <div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-bold">Pipeline</h2>{run && <Badge value={run.error ? "failed" : "completed"} />}</div>
          {error && <div className="mb-3"><Alert>{error}</Alert></div>}
          {run?.error && <div className="mb-3"><Alert>{run.error}</Alert></div>}
          <StageList stages={run?.stages || IDLE} />
        </div>
      </div>
    </>
  );
}
