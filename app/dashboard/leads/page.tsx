"use client";
import { useEffect, useMemo, useState } from "react";
import { Alert, Badge, PageHeader, Spinner } from "@/components/ui";
import { useShell } from "@/components/Shell";
import { fmtDate, initials, useApi } from "@/lib/client";

const STATUSES = ["new", "needs_review", "assigned", "contacted", "qualified", "in progress", "closed", "won", "lost", "disqualified"];

export default function Leads() {
  const { openCreate, openImport, openLead, version } = useShell();
  const { data, error, loading, reload } = useApi<any[]>("/api/leads");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  useEffect(() => { if (version) reload(); }, [version]); // eslint-disable-line
  useEffect(() => { const s = new URLSearchParams(window.location.search).get("status"); if (s) setStatus(s); }, []);

  const rows = useMemo(() => (data || []).filter((l) =>
    (status === "all" || (l.status || "new") === status) &&
    [l.contact_name, l.email, l.company, l.lead_reference, l.industry].join(" ").toLowerCase().includes(search.toLowerCase())), [data, search, status]);

  return (
    <>
      <PageHeader title="Leads" subtitle={`${data?.length ?? 0} leads in your database`}>
        <button className="btn-accent" onClick={openImport}>⬆ Import CSV</button>
        <button className="btn-dark" onClick={openCreate}>+ Create Lead</button>
      </PageHeader>
      <div className="card p-5">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <input className="input max-w-xs" placeholder="Search name, email, company…" value={search} onChange={(e) => setSearch(e.target.value)} />
          <div className="flex flex-wrap gap-1.5">
            {["all", ...STATUSES].map((s) => <button key={s} onClick={() => setStatus(s)} className={`chip transition ${status === s ? "bg-onyx text-chalk" : "bg-chalk-2 hover:bg-chalk-3"}`}>{s}</button>)}
          </div>
        </div>
        {error && <Alert>{error}</Alert>}
        {loading && !data ? <div className="grid place-items-center py-16"><Spinner className="h-6 w-6" /></div> : (
          <div className="overflow-x-auto">
            <table className="w-full"><thead><tr>{["Contact", "Company", "Industry", "Priority", "Owner", "Status", "Added"].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
              <tbody>
                {rows.map((l) => (
                  <tr key={l.id} onClick={() => openLead(l.id)} className="cursor-pointer border-t border-chalk-2 transition hover:bg-tangerine-soft/60">
                    <td className="td"><div className="flex items-center gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-onyx text-xs font-bold text-chalk">{initials(l.contact_name)}</span><div><div className="font-semibold">{l.contact_name}</div><div className="text-xs text-onyx/50">{l.email}</div></div></div></td>
                    <td className="td">{l.company || "—"}</td><td className="td">{l.industry || "—"}</td>
                    <td className="td"><Badge value={l.priority} /></td><td className="td">{l.assigned_owner || <span className="text-onyx/40">Unassigned</span>}</td>
                    <td className="td"><Badge value={l.status} /></td><td className="td text-onyx/60">{fmtDate(l.created_at)}</td>
                  </tr>
                ))}
                {!rows.length && <tr><td colSpan={7} className="td py-12 text-center text-onyx/50">No leads match.</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
