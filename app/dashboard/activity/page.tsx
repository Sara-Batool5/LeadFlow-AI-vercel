"use client";
import { useEffect, useMemo, useState } from "react";
import { Alert, Badge, PageHeader, Spinner } from "@/components/ui";
import { useShell } from "@/components/Shell";
import { fmtDateTime, useApi } from "@/lib/client";

const label = (k: string) => k.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase()).replace(/\bid\b/gi, "ID");
const SNAKE = /^[a-z0-9]+(_[a-z0-9]+)+$/;

function Value({ v }: { v: any }) {
  if (v === null || v === undefined || v === "") return <span className="text-onyx/40">—</span>;
  if (typeof v === "boolean") return <span className={`chip ${v ? "bg-emerald-100 text-emerald-800" : "bg-chalk-2 text-onyx/70"}`}>{v ? "Yes" : "No"}</span>;
  if (Array.isArray(v)) return v.length ? <span>{v.map((x) => (typeof x === "object" ? JSON.stringify(x) : String(x))).join(", ")}</span> : <span className="text-onyx/40">None</span>;
  if (typeof v === "object") return <Rows data={v} />;
  if (typeof v === "string" && SNAKE.test(v)) return <span className="font-semibold capitalize">{v.replace(/_/g, " ")}</span>;
  return <span className="whitespace-pre-wrap break-words">{String(v)}</span>;
}

function Rows({ data }: { data: Record<string, any> }) {
  const entries = Object.entries(data || {});
  if (!entries.length) return <span className="text-onyx/40">No extra details were recorded for this event.</span>;
  return (
    <dl className="grid gap-x-6 gap-y-2.5 sm:grid-cols-[minmax(150px,220px)_1fr]">
      {entries.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="text-xs font-semibold uppercase tracking-wide text-onyx/50">{label(k)}</dt>
          <dd className="text-sm">{<Value v={v} />}</dd>
        </div>
      ))}
    </dl>
  );
}

export default function Activity() {
  const { openLead, version } = useShell();
  const { data, error, loading, reload } = useApi<any[]>("/api/events");
  const [type, setType] = useState("all");
  const [open, setOpen] = useState<number | null>(null);
  useEffect(() => { if (version) reload(); }, [version]); // eslint-disable-line
  useEffect(() => { const t = new URLSearchParams(window.location.search).get("type"); if (t) setType(t); }, []);

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
                {open === e.id && (
                  <div className="mt-3 animate-pop rounded-2xl bg-white p-4">
                    <Rows data={e.details} />
                    <details className="mt-3 text-xs text-onyx/50"><summary className="cursor-pointer font-semibold">Show raw data</summary><pre className="mt-2 max-h-48 overflow-auto rounded-xl bg-onyx p-3 text-chalk">{JSON.stringify(e.details, null, 2)}</pre></details>
                  </div>
                )}
              </li>
            ))}
            {!rows.length && <li className="py-12 text-center text-sm text-onyx/50">No events.</li>}
          </ul>
        )}
      </div>
    </>
  );
}
