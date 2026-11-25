"use client";
import { useEffect, useMemo, useState } from "react";
import { Alert, Badge, PageHeader, Spinner } from "@/components/ui";
import { useShell } from "@/components/Shell";
import { fmtDate, initials, useApi } from "@/lib/client";

const STATUSES = ["new", "needs_review", "assigned", "contacted", "qualified", "in progress", "closed", "won", "lost", "disqualified"];

export default function Leads() {
  const { openCreate, openImport, openLead, version } = useShell();
  const { data, error, loading, reload } = useApi<any[]>("/api/leads");
  const statusList = useApi<string[]>("/api/statuses").data || STATUSES;
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [extra, setExtra] = useState<Record<string, string>>({});
  useEffect(() => { if (version) reload(); }, [version]); // eslint-disable-line
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if (p.get("status")) setStatus(p.get("status")!);
    const e: Record<string, string> = {};
    ["recent", "unassigned", "source", "industry", "priority"].forEach((k) => { if (p.get(k)) e[k] = p.get(k)!; });
    setExtra(e);
  }, []);

  const rows = useMemo(() => (data || []).filter((l) =>
    (status === "all" || (l.status || "new") === status) &&
    (!extra.recent || Date.now() - new Date(l.created_at).getTime() < Number(extra.recent) * 86400000) &&
    (!extra.unassigned || !l.assigned_owner_id) &&
    (!extra.source || (l.source || "unknown") === extra.source) &&
    (!extra.industry || (l.industry || "") === extra.industry) &&
    (!extra.priority || (l.priority || "") === extra.priority) &&
    [l.contact_name, l.email, l.company, l.lead_reference, l.industry].join(" ").toLowerCase().includes(search.toLowerCase())), [data, search, status, extra]);

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
            {["all", ...statusList].map((s) => <button key={s} onClick={() => setStatus(s)} className={`chip transition ${status === s ? "bg-onyx text-chalk" : "bg-chalk-2 hover:bg-chalk-3"}`}>{s.replace(/_/g, " ")} <span className="opacity-60">{s === "all" ? (data?.length ?? 0) : (data || []).filter((l) => (l.status || "new") === s).length}</span></button>)}
          </div>
        </div>
        {Object.keys(extra).length > 0 && (
          <div className="mb-4 flex flex-wrap items-center gap-2 text-xs">
            <span className="text-onyx/50">Filtered by:</span>
            {Object.entries(extra as Record<string, string>).map(([k, v]) => <span key={k} className="chip bg-tangerine-soft text-tangerine-dark">{k === "recent" ? `last ${v} days` : k === "unassigned" ? "no owner" : `${k}: ${v.replace(/_/g, " ")}`}</span>)}
            <button className="font-semibold underline" onClick={() => { setExtra({}); window.history.replaceState(null, "", "/dashboard/leads"); }}>Clear</button>
          </div>
        )}
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
