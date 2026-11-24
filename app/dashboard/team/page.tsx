"use client";
import { useState } from "react";
import { Alert, PageHeader, Spinner } from "@/components/ui";
import { api, useApi } from "@/lib/client";

export default function Team() {
  const { data, error, loading, reload } = useApi<any[]>("/api/owners");
  const [f, setF] = useState({ full_name: "", email: "", specialization: "General Business", active_lead_limit: 10 });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function add() {
    setBusy(true); setErr("");
    try { await api("/api/owners", { method: "POST", body: f }); setF({ ...f, full_name: "", email: "" }); reload(); } catch (e: any) { setErr(e.message); }
    setBusy(false);
  }
  const toggle = async (o: any) => { await api("/api/owners", { method: "PATCH", body: { id: o.id, is_available: !o.is_available } }); reload(); };

  return (
    <>
      <PageHeader title="Sales Team" subtitle="Owners are matched to leads by industry, then balanced by workload and capacity." />
      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <div className="card p-5">
          {error && <Alert>{error}</Alert>}
          {loading && !data ? <div className="grid place-items-center py-16"><Spinner className="h-6 w-6" /></div> : (
            <div className="grid gap-3 sm:grid-cols-2">
              {(data || []).map((o) => {
                const pct = Math.min(100, (o.active_leads / Math.max(o.active_lead_limit, 1)) * 100);
                return (
                  <div key={o.id} className="rounded-3xl bg-white p-5 transition hover:-translate-y-1 hover:shadow-soft">
                    <div className="flex items-start justify-between gap-2"><div><div className="font-bold">{o.full_name}</div><div className="text-xs text-onyx/50">{o.email}</div></div>
                      <button onClick={() => toggle(o)} className={`relative h-6 w-11 rounded-full transition ${o.is_available ? "bg-tangerine" : "bg-chalk-3"}`} aria-label="Toggle availability"><span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${o.is_available ? "left-[22px]" : "left-0.5"}`} /></button></div>
                    <div className="mt-3 text-xs font-semibold text-onyx/60">{o.specialization || "No specialization"}</div>
                    <div className="mt-3 flex justify-between text-xs"><span>Workload</span><b>{o.active_leads}/{o.active_lead_limit}</b></div>
                    <div className="mt-1 h-2 rounded-full bg-chalk-2"><div className={`h-2 rounded-full transition-all duration-700 ${pct >= 100 ? "bg-rose-500" : "bg-tangerine"}`} style={{ width: `${pct}%` }} /></div>
                    <div className="mt-2 text-[11px] text-onyx/45">{o.is_available ? "Available for new leads" : "Unavailable"}</div>
                  </div>
                );
              })}
              {data?.length === 0 && <p className="col-span-2 py-10 text-center text-sm text-onyx/50">No sales owners yet. Add your first one.</p>}
            </div>
          )}
        </div>
        <div className="card h-fit p-5">
          <h2 className="mb-4 font-bold">Add sales owner</h2>
          <div className="space-y-3">
            <div><label className="label">Full name</label><input className="input" value={f.full_name} onChange={(e) => setF({ ...f, full_name: e.target.value })} /></div>
            <div><label className="label">Email</label><input className="input" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></div>
            <div><label className="label">Specialization</label><input className="input" value={f.specialization} onChange={(e) => setF({ ...f, specialization: e.target.value })} /><p className="mt-1 text-[11px] text-onyx/45">Industry names, comma-separated, or “General Business”.</p></div>
            <div><label className="label">Active lead limit</label><input className="input" type="number" min={1} value={f.active_lead_limit} onChange={(e) => setF({ ...f, active_lead_limit: Number(e.target.value) })} /></div>
            {err && <Alert>{err}</Alert>}
            <button className="btn-accent w-full" disabled={busy} onClick={add}>{busy ? <Spinner /> : "Add owner"}</button>
          </div>
        </div>
      </div>
    </>
  );
}
