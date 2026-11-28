"use client";
import { useEffect, useState } from "react";
import { Alert, Badge, Modal, PageHeader, Spinner } from "@/components/ui";
import BatchPanel from "@/components/BatchPanel";
import { useShell } from "@/components/Shell";
import { api, fmtDateTime, useApi } from "@/lib/client";

const pretty = (s: string) => String(s || "").replace(/_/g, " ");

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

function ReviewCard({ l, onChange, onOpen }: { l: any; onChange: () => void; onOpen: () => void }) {
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const route = l.decision?.decision_category;
  const missing: string[] = (l.missing_information || []).filter(Boolean);
  async function act(action: "approve" | "disqualify") {
    if (action === "disqualify" && !confirm("Mark this lead as not a fit?")) return;
    setBusy(action); setMsg(null);
    try { const r = await api(`/api/leads/${l.id}/review`, { method: "POST", body: { action } }); setMsg({ kind: "ok", text: r.message }); setTimeout(onChange, 900); }
    catch (e: any) { setMsg({ kind: "error", text: e.message }); }
    setBusy("");
  }
  return (
    <div className="card animate-fadeUp p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <button onClick={onOpen} className="text-left font-bold hover:text-tangerine-dark">{l.contact_name} <span className="font-normal text-onyx/50">· {l.company || l.email}</span></button>
          <div className="text-xs text-onyx/45">{l.lead_reference}{l.industry ? ` · ${l.industry}` : ""} · {fmtDateTime(l.created_at)}</div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {l.score !== null && l.score !== undefined && <span className="chip bg-onyx text-chalk">Score {l.score}</span>}
          {route && <span className="chip bg-tangerine-soft capitalize text-tangerine-dark">{pretty(route)}</span>}
          <Badge value={l.status} />
        </div>
      </div>
      {l.reasoning && <p className="mt-3 text-sm text-onyx/75">{l.reasoning}</p>}
      {missing.length > 0 && <p className="mt-2 text-xs text-onyx/55"><b>Could clarify:</b> {missing.slice(0, 4).join(" · ")}</p>}
      {(l.decision?.next_action || l.recommended_next_action) && <p className="mt-2 rounded-2xl bg-white p-3 text-sm"><span className="text-xs font-bold uppercase text-tangerine-dark">Suggested next step</span><br />{l.decision?.next_action || l.recommended_next_action}</p>}
      {msg && <div className="mt-3"><Alert kind={msg.kind}>{msg.text}</Alert></div>}
      <div className="mt-4 flex flex-wrap gap-2">
        <button className="btn-accent btn-sm" disabled={!!busy} onClick={() => act("approve")}>{busy === "approve" ? <><Spinner /> Sending to sales…</> : "✓ Approve for sales"}</button>
        <button className="btn-ghost btn-sm" disabled={!!busy} onClick={onOpen}>Open lead</button>
        <button className="btn-ghost btn-sm text-rose-700" disabled={!!busy} onClick={() => act("disqualify")}>{busy === "disqualify" ? <Spinner /> : "Not a fit"}</button>
      </div>
    </div>
  );
}

export default function Review() {
  const { version, openLead, bump } = useShell();
  const queue = useApi<any[]>("/api/review");
  const drafts = useApi<any[]>("/api/drafts");
  const [tab, setTab] = useState("leads");
  const [batch, setBatch] = useState<{ id: number; name: string; company?: string }[] | null>(null);
  useEffect(() => { if (version) { queue.reload(); drafts.reload(); } }, [version]); // eslint-disable-line

  const refresh = () => { queue.reload(); drafts.reload(); bump(); };
  const pending = (drafts.data || []).filter((d) => d.draft_status === "pending_review");
  const list = tab === "pending" ? pending : tab === "approved" ? (drafts.data || []).filter((d) => d.draft_status === "approved") : [];
  const q = queue.data || [];

  return (
    <>
      <PageHeader title="Human Review" subtitle="Decide what happens to leads the AI could not send to sales on its own, and approve email drafts.">
        {q.length > 0 && <button className="btn-dark" onClick={() => setBatch(q.map((l) => ({ id: l.id, name: l.contact_name, company: l.company })))}>↻ Re-run AI on all {q.length}</button>}
      </PageHeader>

      <div className="mb-4 flex w-fit gap-1 rounded-full bg-chalk-2 p-1">
        {[["leads", `Leads to review (${q.length})`], ["pending", `Email drafts (${pending.length})`], ["approved", "Approved drafts"]].map(([k, l]) => <button key={k} onClick={() => setTab(k)} className={`rounded-full px-4 py-1.5 text-xs font-bold transition ${tab === k ? "bg-onyx text-chalk" : "text-onyx/60 hover:text-onyx"}`}>{l}</button>)}
      </div>

      <div className="space-y-4">
        {(queue.error || drafts.error) && <Alert>{queue.error || drafts.error}</Alert>}
        {tab === "leads" && (
          queue.loading && !queue.data ? <div className="grid place-items-center py-16"><Spinner className="h-6 w-6" /></div> : (
            <div className="grid gap-4 xl:grid-cols-2">
              {q.map((l) => <ReviewCard key={l.id} l={l} onChange={refresh} onOpen={() => openLead(l.id)} />)}
              {!q.length && <div className="card p-10 text-center text-sm text-onyx/50 xl:col-span-2">Nothing waiting. Leads the AI routes to human review or more information appear here.</div>}
            </div>
          )
        )}
        {tab !== "leads" && (drafts.loading && !drafts.data ? <div className="grid place-items-center py-16"><Spinner className="h-6 w-6" /></div> : (
          <div className="grid gap-4 xl:grid-cols-2">
            {list.map((d) => <Draft key={d.id + d.updated_at} d={d} onChange={refresh} />)}
            {!list.length && <div className="card p-10 text-center text-sm text-onyx/50 xl:col-span-2">No drafts here. They are created when the AI sends a lead to sales, or from a lead's panel.</div>}
          </div>
        ))}
      </div>

      <Modal open={!!batch} onClose={() => { setBatch(null); refresh(); }} title="Re-running AI on these leads" wide>
        {batch && <BatchPanel items={batch} requalify onFinished={refresh} />}
      </Modal>
    </>
  );
}
