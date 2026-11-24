"use client";
import { useEffect, useMemo, useState } from "react";
import { Alert, Badge, PageHeader, Spinner } from "@/components/ui";
import { useShell } from "@/components/Shell";
import { fmtDateTime, useApi } from "@/lib/client";

export default function Activity() {
  const { openLead, version } = useShell();
  const { data, error, loading, reload } = useApi<any[]>("/api/events");
  const [type, setType] = useState("all");
  const [open, setOpen] = useState<number | null>(null);
  useEffect(() => { if (version) reload(); }, [version]); // eslint-disable-line

  const types = useMemo(() => [...new Set((data || []).map((e) => e.event_type))].sort(), [data]);
  const rows = (data || []).filter((e) => type === "all" || e.event_type === type);

  return (
    <>
      <PageHeader title="Activity & Audit" subtitle="Every AI decision, assignment, approval and import, newest first.">
        <select className="input !w-auto" value={type} onChange={(e) => setType(e.target.value)}><option value="all">All event types</option>{types.map((t) => <option key={t}>{t}</option>)}</select>
      </PageHeader>
      <div className="card p-5">
        {error && <Alert>{error}</Alert>}
        {loading && !data ? <div className="grid place-items-center py-16"><Spinner className="h-6 w-6" /></div> : (
          <ul className="divide-y divide-chalk-2">
            {rows.map((e) => (
              <li key={e.id} className="py-3.5">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="h-2.5 w-2.5 rounded-full bg-tangerine" />
                  <div className="min-w-0 flex-1"><div className="text-sm font-semibold">{e.message}</div>
                    <div className="text-xs text-onyx/50">{fmtDateTime(e.created_at)} · {e.actor} · {e.event_type}{e.lead_id ? <> · <button className="font-semibold text-tangerine-dark underline" onClick={() => openLead(e.lead_id)}>{e.contact_name || e.lead_reference}</button></> : null}</div></div>
                  <Badge value={e.event_status} />
                  <button className="btn-ghost btn-sm" onClick={() => setOpen(open === e.id ? null : e.id)}>{open === e.id ? "Hide" : "Details"}</button>
                </div>
                {open === e.id && <pre className="mt-3 max-h-64 animate-pop overflow-auto rounded-2xl bg-onyx p-4 text-xs text-chalk">{JSON.stringify(e.details, null, 2)}</pre>}
              </li>
            ))}
            {!rows.length && <li className="py-12 text-center text-sm text-onyx/50">No events.</li>}
          </ul>
        )}
      </div>
    </>
  );
}
