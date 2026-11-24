"use client";
import { useEffect, useState } from "react";
import { Alert, Badge, PageHeader, Spinner } from "@/components/ui";
import { useShell } from "@/components/Shell";
import { api, fmtDateTime, useApi } from "@/lib/client";

function Draft({ d, onChange }: { d: any; onChange: () => void }) {
  const [subject, setSubject] = useState(d.subject);
  const [body, setBody] = useState(d.body);
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const dirty = subject !== d.subject || body !== d.body;
  const run = async (name: string, fn: () => Promise<any>) => { setBusy(name); setErr(""); try { await fn(); onChange(); } catch (e: any) { setErr(e.message); } setBusy(""); };
  return (
    <div className="card animate-fadeUp p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div><div className="font-bold">{d.contact_name || "Lead"} <span className="font-normal text-onyx/50">· {d.company || d.recipient_email}</span></div><div className="text-xs text-onyx/45">{d.lead_reference} · {fmtDateTime(d.created_at)}</div></div>
        <Badge value={d.draft_status} />
      </div>
      <input className="input mb-2 font-semibold" value={subject} onChange={(e) => setSubject(e.target.value)} />
      <textarea className="input min-h-44 text-[13px] leading-relaxed" value={body} onChange={(e) => setBody(e.target.value)} />
      {err && <div className="mt-2"><Alert>{err}</Alert></div>}
      <div className="mt-3 flex flex-wrap gap-2">
        <button className="btn-ghost btn-sm" disabled={!dirty || !!busy} onClick={() => run("save", () => api(`/api/drafts/${d.id}`, { method: "PATCH", body: { lead_id: d.lead_id, recipient_email: d.recipient_email, subject, body } }))}>{busy === "save" ? <Spinner /> : "Save changes"}</button>
        {d.draft_status !== "approved" && <button className="btn-accent btn-sm" disabled={dirty || !!busy} title={dirty ? "Save your edits first" : ""} onClick={() => run("ok", () => api(`/api/drafts/${d.id}`, { method: "PATCH", body: { action: "approve" } }))}>{busy === "ok" ? <Spinner /> : "✓ Approve"}</button>}
        <button className="btn-ghost btn-sm text-rose-700" disabled={!!busy} onClick={() => confirm("Delete this draft?") && run("del", () => api(`/api/drafts/${d.id}`, { method: "DELETE" }))}>Delete</button>
        {d.draft_status === "approved" && <span className="self-center text-xs text-onyx/50">Approved by {d.approved_by}. No email was sent.</span>}
      </div>
    </div>
  );
}

export default function Review() {
  const { version, openLead } = useShell();
  const drafts = useApi<any[]>("/api/drafts");
  const events = useApi<any[]>("/api/events");
  const [tab, setTab] = useState("pending_review");
  useEffect(() => { if (version) { drafts.reload(); events.reload(); } }, [version]); // eslint-disable-line

  const list = (drafts.data || []).filter((d) => (tab === "all" ? true : d.draft_status === tab));
  const decisions = (events.data || []).filter((e) => e.event_type === "ai_decision_made" && ["human_review", "request_information"].includes(e.details?.decision_category)).slice(0, 8);
  const pending = (drafts.data || []).filter((d) => d.draft_status === "pending_review").length;

  return (
    <>
      <PageHeader title="Human Review" subtitle="Edit and approve AI email drafts, and see the decisions that need a person." />
      <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
        <div className="space-y-4">
          <div className="flex gap-1 self-start rounded-full bg-chalk-2 p-1 w-fit">
            {[["pending_review", `Pending (${pending})`], ["approved", "Approved"], ["all", "All"]].map(([k, l]) => <button key={k} onClick={() => setTab(k)} className={`rounded-full px-4 py-1.5 text-xs font-bold transition ${tab === k ? "bg-onyx text-chalk" : "text-onyx/60 hover:text-onyx"}`}>{l}</button>)}
          </div>
          {drafts.error && <Alert>{drafts.error}</Alert>}
          {drafts.loading && !drafts.data ? <div className="grid place-items-center py-16"><Spinner className="h-6 w-6" /></div> : list.map((d) => <Draft key={d.id + d.updated_at} d={d} onChange={drafts.reload} />)}
          {!drafts.loading && !list.length && <div className="card p-10 text-center text-sm text-onyx/50">Nothing here. Generate drafts from a lead or run the agent workflow.</div>}
        </div>
        <div className="card-dark h-fit p-5">
          <h2 className="mb-1 font-bold">Decisions needing a person</h2>
          <p className="mb-4 text-xs text-chalk/50">Leads the AI routed to human review or more information.</p>
          <ul className="space-y-2">
            {decisions.map((e) => (
              <li key={e.id}><button onClick={() => openLead(e.lead_id)} className="w-full rounded-2xl bg-white/[.07] p-3 text-left text-sm transition hover:bg-white/[.15]">
                <div className="font-semibold">{e.contact_name || "Lead"} <span className="font-normal text-chalk/50">· {e.company || ""}</span></div>
                <div className="mt-0.5 text-xs capitalize text-tangerine">{e.details.decision_category.replace(/_/g, " ")}</div>
                <div className="mt-1 text-xs text-chalk/60">{e.details.next_action}</div></button></li>
            ))}
            {!decisions.length && <li className="text-sm text-chalk/50">No open decisions.</li>}
          </ul>
        </div>
      </div>
    </>
  );
}
