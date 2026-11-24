"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Alert, Badge, PageHeader, Spinner } from "@/components/ui";
import { useShell } from "@/components/Shell";
import { fmtDate, initials, useApi } from "@/lib/client";

const ORDER = ["new", "contacted", "qualified", "in progress", "won", "lost", "disqualified", "closed"];

function AreaChart({ points }: { points: { day: string; n: number }[] }) {
  const ref = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<number | null>(null);
  const W = 800, H = 240, P = 14;
  const max = Math.max(4, ...points.map((p) => p.n));
  const x = (i: number) => P + (i * (W - 2 * P)) / Math.max(points.length - 1, 1);
  const y = (v: number) => H - 24 - (v / max) * (H - 60);
  const line = points.map((p, i) => `${i ? "L" : "M"}${x(i)},${y(p.n)}`).join(" ");
  const area = `${line} L${x(points.length - 1)},${H - 24} L${x(0)},${H - 24} Z`;
  const move = (e: React.PointerEvent) => {
    const r = ref.current!.getBoundingClientRect();
    setHover(Math.max(0, Math.min(points.length - 1, Math.round(((e.clientX - r.left) / r.width * W - P) / ((W - 2 * P) / Math.max(points.length - 1, 1))))));
  };
  const h = hover !== null ? points[hover] : null;
  return (
    <div className="relative">
      <svg ref={ref} viewBox={`0 0 ${W} ${H}`} className="h-60 w-full" onPointerMove={move} onPointerLeave={() => setHover(null)}>
        <defs><linearGradient id="g" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#FF8A1C" stopOpacity=".45" /><stop offset="1" stopColor="#FF8A1C" stopOpacity="0" /></linearGradient></defs>
        {[0, 0.5, 1].map((t) => <line key={t} x1={P} x2={W - P} y1={y(max * t)} y2={y(max * t)} stroke="#D9D6CF" strokeDasharray="4 6" />)}
        <path d={area} fill="url(#g)" />
        <path d={line} fill="none" stroke="#FF8A1C" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray="1" strokeDashoffset="1" style={{ animation: "dash 1.2s .1s forwards ease-out" }} />
        {h && <><line x1={x(hover!)} x2={x(hover!)} y1={10} y2={H - 24} stroke="#121214" strokeDasharray="3 4" /><circle cx={x(hover!)} cy={y(h.n)} r="6" fill="#FF8A1C" stroke="#121214" strokeWidth="2.5" /></>}
        {[0, Math.floor(points.length / 2), points.length - 1].map((i) => <text key={i} x={x(i)} y={H - 4} fontSize="12" fill="#12121490" textAnchor={i === 0 ? "start" : i === points.length - 1 ? "end" : "middle"}>{points[i]?.day.slice(5)}</text>)}
      </svg>
      {h && <div className="pointer-events-none absolute top-2 rounded-2xl bg-onyx px-3.5 py-2 text-chalk shadow-xl" style={{ left: `clamp(0px, calc(${(x(hover!) / W) * 100}% - 50px), calc(100% - 110px))` }}>
        <div className="text-[11px] text-chalk/60">{h.day}</div><div className="text-lg font-extrabold">{h.n} <span className="text-xs font-medium text-chalk/60">new leads</span></div></div>}
    </div>
  );
}

export default function Overview() {
  const { openCreate, openImport, openLead, version } = useShell();
  const stats = useApi<any>("/api/stats");
  const leads = useApi<any[]>("/api/leads");
  const [range, setRange] = useState(30);
  useEffect(() => { if (version) { stats.reload(); leads.reload(); } }, [version]); // eslint-disable-line

  const s = stats.data;
  const count = (k: string) => s?.byStatus.find((x: any) => x.k === k)?.n || 0;
  const maxStatus = Math.max(1, ...(s?.byStatus.map((x: any) => x.n) || [1]));
  const points = s ? s.daily.slice(-range) : [];
  const high = s?.byCategory.find((x: any) => x.k === "high_fit")?.n || 0;

  return (
    <>
      <PageHeader title="Overview" subtitle="Track your leads and AI pipeline performance in one place.">
        <button className="btn-accent" onClick={openImport}>⬆ Import CSV</button>
        <button className="btn-dark" onClick={openCreate}>+ Create Lead</button>
      </PageHeader>
      {stats.error && <div className="mb-4"><Alert>{stats.error}. Check the Setup page for your environment variables.</Alert></div>}

      <div className="grid gap-4 xl:grid-cols-[300px_1fr]">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
          <div className="card p-6">
            <div className="text-xs font-semibold uppercase tracking-wide text-onyx/50">Total leads</div>
            <div className="mt-2 text-6xl font-extralight tracking-tight">{s ? s.total : <Spinner />}</div>
            <div className="mt-2 text-sm font-semibold text-tangerine-dark">{s ? `+${s.last7} in the last 7 days` : ""}</div>
            <div className="mt-5 flex h-14 items-end gap-[3px]">{(s?.daily.slice(-30) || []).map((d: any, i: number) => <span key={i} className="flex-1 rounded-sm bg-onyx/15 transition-all hover:bg-tangerine" style={{ height: `${Math.max(8, (d.n / Math.max(1, ...s.daily.map((x: any) => x.n))) * 100)}%`, background: i === 29 ? "#FF8A1C" : undefined }} />)}</div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[["Qualified", count("qualified")], ["High fit", high], ["Unassigned", s?.unassigned ?? 0], ["Drafts to review", s?.drafts.pending ?? 0]].map(([k, v], i) => (
              <div key={k as string} className="card p-5 transition hover:-translate-y-1"><div className={`mb-3 h-8 w-8 rounded-xl ${i === 0 ? "bg-tangerine" : "bg-onyx"}`} /><div className="text-3xl font-light">{v}</div><div className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-onyx/50">{k}</div></div>
            ))}
          </div>
        </div>

        <div className="card p-6">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
            <div><h2 className="text-xl font-bold">New leads</h2><p className="text-xs text-onyx/50">Leads created per day</p></div>
            <div className="flex gap-1 rounded-full bg-chalk-2 p-1">{[[14, "14 days"], [30, "30 days"]].map(([n, l]) => <button key={n} onClick={() => setRange(n as number)} className={`rounded-full px-4 py-1.5 text-xs font-bold transition ${range === n ? "bg-onyx text-chalk" : "text-onyx/60 hover:text-onyx"}`}>{l}</button>)}</div>
          </div>
          {s ? <AreaChart key={range} points={points} /> : <div className="grid h-60 place-items-center"><Spinner className="h-6 w-6" /></div>}
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="card-dark p-6">
          <div className="mb-5 flex items-center justify-between"><h2 className="text-xl font-bold">Sales pipeline</h2><span className="chip bg-white/10 text-chalk/80">{s?.total ?? 0} leads</span></div>
          <div className="space-y-3">
            {(s ? [...s.byStatus].sort((a: any, b: any) => ORDER.indexOf(a.k) - ORDER.indexOf(b.k)) : []).map((r: any) => (
              <Link key={r.k} href={`/dashboard/leads?status=${encodeURIComponent(r.k)}`} className="group block">
                <div className="mb-1 flex justify-between text-sm"><span className="capitalize text-chalk/80 transition group-hover:text-tangerine">{r.k}</span><b>{r.n}</b></div>
                <div className="h-2.5 rounded-full bg-white/10"><div className="h-2.5 rounded-full bg-tangerine transition-all duration-700 group-hover:brightness-125" style={{ width: `${(r.n / maxStatus) * 100}%` }} /></div>
              </Link>
            ))}
          </div>
        </div>
        <div className="card-dark p-6">
          <div className="mb-5 flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-full bg-tangerine text-onyx">✦</span><h2 className="text-xl font-bold">AI insights</h2></div>
          <ul className="space-y-2.5 text-sm">
            {s && [
              [`${s.last7} new lead${s.last7 === 1 ? "" : "s"} arrived in the last 7 days.`, s.last7],
              [s.bySource[0] ? `Top lead source: ${s.bySource[0].k.replace(/_/g, " ")}.` : "No source data yet.", s.bySource[0]?.n ?? 0],
              [`Average AI qualification score across ${s.qualified.n} assessments.`, s.qualified.avg],
              [`${s.unassigned} lead${s.unassigned === 1 ? " has" : "s have"} no owner yet.`, s.unassigned],
              [`${s.drafts.pending} email draft${s.drafts.pending === 1 ? " is" : "s are"} waiting for approval.`, s.drafts.pending],
            ].map(([t, n], i) => <li key={i} className="flex items-center justify-between gap-3 rounded-2xl bg-white/[.07] px-4 py-3 transition hover:bg-white/[.14]"><span className="text-chalk/85">{t}</span><b className="text-tangerine">{n}</b></li>)}
          </ul>
        </div>
      </div>

      <div className="card mt-4 p-6">
        <div className="mb-4 flex items-center justify-between"><h2 className="text-xl font-bold">Recent leads</h2><Link href="/dashboard/leads" className="btn-dark btn-sm">View all →</Link></div>
        <div className="overflow-x-auto">
          <table className="w-full"><thead><tr>{["Contact", "Company", "Industry", "Source", "Status", "Added"].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
            <tbody>
              {(leads.data || []).slice(0, 6).map((l) => (
                <tr key={l.id} onClick={() => openLead(l.id)} className="cursor-pointer border-t border-chalk-2 transition hover:bg-tangerine-soft/60">
                  <td className="td"><div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-full bg-onyx text-xs font-bold text-chalk">{initials(l.contact_name)}</span><div><div className="font-semibold">{l.contact_name}</div><div className="text-xs text-onyx/50">{l.email}</div></div></div></td>
                  <td className="td">{l.company || "—"}</td><td className="td">{l.industry || "—"}</td><td className="td">{l.source || "—"}</td>
                  <td className="td"><Badge value={l.status} /></td><td className="td text-onyx/60">{fmtDate(l.created_at)}</td>
                </tr>
              ))}
              {leads.data?.length === 0 && <tr><td colSpan={6} className="td py-10 text-center text-onyx/50">No leads yet. Import a CSV or create your first lead.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
