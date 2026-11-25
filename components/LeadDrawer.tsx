"use client";
import { useCallback, useEffect, useState } from "react";
import { api, fmtDateTime } from "@/lib/client";
import { Alert, Badge, Spinner } from "./ui";

const STATUSES = ["new", "needs_review", "assigned", "contacted", "qualified", "in progress", "closed", "won", "lost", "disqualified"];
const PURPOSES = ["Introductory follow-up after an inquiry", "Request missing information", "Propose a discovery call", "Re-engage a quiet lead"];
const TONES = ["Professional and friendly", "Formal", "Warm and conversational", "Short and direct"];

export default function LeadDrawer({ id, onClose, onChange }: { id: number | null; onClose: () => void; onChange: () => void }) {
  const [d, setD] = useState<any>(null);
  const [owners, setOwners] = useState<any[]>([]);
  const [statuses, setStatuses] = useState<string[]>(STATUSES);
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [purpose, setPurpose] = useState(PURPOSES[0]);
  const [tone, setTone] = useState(TONES[0]);
  const [extra, setExtra] = useState("");

  const load = useCallback(async () => {
    if (!id) return;
    try { setD(await api(`/api/leads/${id}`)); } catch (e: any) { setMsg({ kind: "error", text: e.message }); }
  }, [id]);

  useEffect(() => { setD(null); setMsg(null); if (id) { load(); api("/api/owners").then(setOwners).catch(() => {}); api("/api/statuses").then(setStatuses).catch(() => {}); } }, [id, load]);
  useEffect(() => {
    if (!id) return;
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k);
  }, [id, onClose]);

  async function act(name: string, fn: () => Promise<any>, ok: string) {
    setBusy(name); setMsg(null);
    try { const r = await fn(); setMsg({ kind: r?.ok === false ? "error" : "ok", text: r?.message || ok }); await load(); onChange(); }
    catch (e: any) { setMsg({ kind: "error", text: e.message }); }
    setBusy("");
  }

  if (!id) return null;
  const lead = d?.lead, q = d?.qualifications?.[0];

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-onyx/40 backdrop-blur-sm" onClick={onClose} />
      <aside className="absolute right-0 top-0 h-full w-full max-w-xl animate-slideIn overflow-y-auto bg-chalk p-5 shadow-2xl sm:rounded-l-[32px]">
        <div className="mb-5 flex items-start justify-between">
          <div>
            <div className="text-xs font-semibold text-onyx/50">{lead?.lead_reference}</div>
            <h2 className="text-2xl font-extrabold">{lead?.contact_name || "Loading…"}</h2>
            <div className="text-sm text-onyx/60">{[lead?.job_title, lead?.company].filter(Boolean).join(" · ")}</div>
          </div>
          <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full bg-paper transition hover:bg-onyx hover:text-chalk">✕</button>
        </div>
        {!lead ? <div className="grid place-items-center py-20"><Spinner className="h-6 w-6" /></div> : (
          <div className="space-y-4">
            {msg && <Alert kind={msg.kind}>{msg.text}</Alert>}

            <section className="card p-5">
              <div className="mb-4 flex flex-wrap gap-2"><Badge value={lead.status} /><Badge value={lead.priority} /></div>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                {[["Email", lead.email], ["Website", lead.website], ["Industry", lead.industry], ["Company size", lead.company_size], ["Country", lead.country], ["Source", lead.source], ["Budget", lead.budget], ["Timeline", lead.timeline]].map(([k, v]) => (
                  <div key={k}><dt className="label !mb-0.5">{k}</dt><dd className="break-words">{v || "—"}</dd></div>
                ))}
                <div className="col-span-2"><dt className="label !mb-0.5">Business need</dt><dd>{lead.description || "—"}</dd></div>
              </dl>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div><label className="label">Status</label>
                  <select className="input" value={lead.status || "new"} onChange={(e) => act("status", () => api(`/api/leads/${id}`, { method: "PATCH", body: { status: e.target.value } }), "Status updated.")}>
                    {[...new Set([lead.status || "new", ...statuses])].map((s) => <option key={s}>{s}</option>)}
                  </select></div>
                <div><label className="label">Owner</label>
                  <select className="input" value={lead.assigned_owner_id || ""} onChange={(e) => act("owner", () => api(`/api/leads/${id}/assign`, { method: "POST", body: { ownerId: e.target.value || null } }), "Owner updated.")}>
                    <option value="">Unassigned</option>{owners.map((o) => <option key={o.id} value={o.id}>{o.full_name} ({o.active_leads}/{o.active_lead_limit})</option>)}
                  </select></div>
              </div>
              <button className="btn-ghost btn-sm mt-3" disabled={!!busy} onClick={() => act("auto", () => api(`/api/leads/${id}/assign`, { method: "POST", body: {} }), "Assigned.")}>{busy === "auto" ? <Spinner /> : "⚡ Auto-assign best owner"}</button>
            </section>

            <section className="card-dark p-5">
              <div className="mb-3 flex items-center justify-between"><h3 className="font-bold">AI qualification</h3>
                <button className="btn-accent btn-sm" disabled={!!busy} onClick={() => act("qualify", () => api(`/api/leads/${id}/qualify`, { method: "POST" }), "Qualification complete.")}>{busy === "qualify" ? <><Spinner /> Analysing…</> : q ? "Re-run" : "Run qualification"}</button></div>
              {q ? (
                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-4">
                    <div className="grid h-16 w-16 place-items-center rounded-full text-xl font-extrabold text-onyx" style={{ background: `conic-gradient(#FF8A1C ${q.score * 3.6}deg, #3a3a42 0)` }}><span className="grid h-12 w-12 place-items-center rounded-full bg-onyx text-chalk">{q.score}</span></div>
                    <div><div className="font-bold capitalize">{String(q.category).replace(/_/g, " ")}</div><div className="text-xs text-chalk/50">{q.human_review_required ? "Human review recommended" : "No review flagged"}</div></div>
                  </div>
                  <p className="text-chalk/80">{q.reasoning}</p>
                  {(q.missing_information || []).filter(Boolean).length > 0 && <div><div className="text-xs font-bold uppercase text-chalk/50">Missing</div><ul className="list-disc pl-5 text-chalk/80">{q.missing_information.map((m: string) => <li key={m}>{m}</li>)}</ul></div>}
                  <div className="rounded-2xl bg-white/10 p-3"><span className="text-xs font-bold uppercase text-tangerine">Next action</span><div>{q.recommended_next_action}</div></div>
                </div>
              ) : <p className="text-sm text-chalk/60">No qualification yet.</p>}
            </section>

            <section className="card p-5">
              <h3 className="mb-3 font-bold">Follow-up email</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <select className="input" value={purpose} onChange={(e) => setPurpose(e.target.value)}>{PURPOSES.map((p) => <option key={p}>{p}</option>)}</select>
                <select className="input" value={tone} onChange={(e) => setTone(e.target.value)}>{TONES.map((p) => <option key={p}>{p}</option>)}</select>
              </div>
              <input className="input mt-3" placeholder="Extra instructions (optional)" value={extra} onChange={(e) => setExtra(e.target.value)} />
              <button className="btn-dark btn-sm mt-3" disabled={!!busy} onClick={() => act("draft", () => api(`/api/leads/${id}/draft`, { method: "POST", body: { purpose, tone, extra } }), "Draft saved for review.")}>{busy === "draft" ? <><Spinner /> Writing…</> : "✉ Generate draft"}</button>
              {d.drafts.map((x: any) => (
                <details key={x.id} className="mt-3 rounded-2xl bg-white p-3 text-sm">
                  <summary className="flex cursor-pointer items-center justify-between gap-2 font-semibold">{x.subject}<Badge value={x.draft_status} /></summary>
                  <p className="mt-2 whitespace-pre-wrap text-onyx/70">{x.body}</p>
                  <a href="/dashboard/review" className="mt-2 inline-block text-xs font-semibold text-tangerine-dark underline">Edit / approve in Human Review →</a>
                </details>
              ))}
            </section>

            <section className="card p-5">
              <h3 className="mb-3 font-bold">Recent activity</h3>
              <ul className="space-y-2.5 text-sm">{d.events.map((e: any) => <li key={e.id} className="flex gap-3"><span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-tangerine" /><div><div>{e.message}</div><div className="text-xs text-onyx/45">{fmtDateTime(e.created_at)} · {e.actor}</div></div></li>)}</ul>
            </section>
          </div>
        )}
      </aside>
    </div>
  );
}
