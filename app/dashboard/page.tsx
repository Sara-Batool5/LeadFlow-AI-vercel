"use client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Badge, PageHeader, Spinner } from "@/components/ui";
import { useShell } from "@/components/Shell";
import { fmtDate, initials, useApi } from "@/lib/client";

const ORDER = ["new", "needs_review", "assigned", "contacted", "qualified", "in progress", "won", "lost", "disqualified", "closed"];
const DOTS = ["#FF8A1C", "#121214", "#FFC23D", "#9A978F", "#E9730A"];
const pretty = (s: string) => String(s).replace(/_/g, " ");
const shortDate = (d: string) => new Date(d + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" });
const dotFor = (s: string) => DOTS[[...String(s || "")].reduce((a, c) => a + c.charCodeAt(0), 0) % DOTS.length];

const ICON: Record<string, string> = {
  trend: "M3 17l6-6 4 4 8-8M15 7h6v6",
  link: "M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1",
  clock: "M12 6v6l4 2M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  building: "M4 21V5l8-3 8 3v16M9 9h1M14 9h1M9 13h1M14 13h1M9 17h6",
  mail: "M4 6h16v12H4zM4 7l8 6 8-6",
  user: "M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z",
  star: "M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z",
};
const Ico = ({ k }: { k: string }) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={ICON[k]} /></svg>;

type Pt = { label: string; n: number; q: number };

function buildSeries(daily: any[], mode: "daily" | "weekly"): Pt[] {
  if (mode === "daily") return daily.slice(-30).map((d) => ({ label: shortDate(d.day), n: d.n, q: d.q }));
  const last = daily.slice(-84), out: Pt[] = [];
  for (let i = 0; i < last.length; i += 7) {
    const g = last.slice(i, i + 7);
    out.push({ label: shortDate(g[0].day), n: g.reduce((a, x) => a + x.n, 0), q: g.reduce((a, x) => a + x.q, 0) });
  }
  return out;
}

// Smooth curve through points (never dips below the baseline).
function smooth(pts: [number, number][], base: number) {
  if (pts.length < 2) return "";
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2, t = 0.18;
    const c1y = Math.min(base, p1[1] + (p2[1] - p0[1]) * t), c2y = Math.min(base, p2[1] - (p3[1] - p1[1]) * t);
    d += ` C${p1[0] + (p2[0] - p0[0]) * t},${c1y} ${p2[0] - (p3[0] - p1[0]) * t},${c2y} ${p2[0]},${p2[1]}`;
  }
  return d;
}

function LeadsChart({ points, mode, sources, best, bestShares }: { points: Pt[]; mode: string; sources: { k: string; pct: number }[]; best: any; bestShares: number[] }) {
  const ref = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<number | null>(null);
  const W = 900, H = 320, P = 16, BASE = H - 30;
  const max = Math.max(4, ...points.map((p) => Math.max(p.n, p.q)));
  const yMax = max * 2.1; // headroom so the floating cards never cover the lines
  const x = (i: number) => P + (i * (W - 2 * P)) / Math.max(points.length - 1, 1);
  const y = (v: number) => BASE - (v / yMax) * (BASE - 24);
  const nPts = points.map((p, i) => [x(i), y(p.n)] as [number, number]);
  const qPts = points.map((p, i) => [x(i), y(p.q)] as [number, number]);
  const nLine = smooth(nPts, BASE), qLine = smooth(qPts, BASE);
  const area = `${nLine} L${x(points.length - 1)},${BASE} L${x(0)},${BASE} Z`;
  const peakI = points.reduce((b, p, i) => (p.n > points[b].n ? i : b), 0);
  const peak = points[peakI];
  const step = (W - 2 * P) / Math.max(points.length - 1, 1);
  const move = (e: React.PointerEvent) => {
    const r = ref.current!.getBoundingClientRect();
    setHover(Math.max(0, Math.min(points.length - 1, Math.round((((e.clientX - r.left) / r.width) * W - P) / step))));
  };
  const h = hover !== null ? points[hover] : null;
  const card = "lg:absolute lg:pointer-events-none";

  return (
    <div className="relative">
      <svg ref={ref} viewBox={`0 0 ${W} ${H}`} className="w-full touch-none" onPointerMove={move} onPointerLeave={() => setHover(null)}>
        <defs>
          <linearGradient id="gArea" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#FF8A1C" stopOpacity=".55" /><stop offset="1" stopColor="#FF8A1C" stopOpacity="0" /></linearGradient>
        </defs>
        {points.map((_, i) => (i % Math.ceil(points.length / 10) === 0) && <line key={i} x1={x(i)} x2={x(i)} y1={10} y2={BASE} stroke="#121214" strokeOpacity=".07" />)}
        <line x1={P} x2={W - P} y1={BASE} y2={BASE} stroke="#121214" strokeOpacity=".35" strokeDasharray="5 6" />
        <path d={area} fill="url(#gArea)" />
        <path d={nLine} fill="none" stroke="#FF8A1C" strokeWidth="3" strokeLinecap="round" pathLength={1} strokeDasharray="1" strokeDashoffset="1" style={{ animation: "dash 1.3s .1s forwards ease-out" }} />
        <path d={qLine} fill="none" stroke="#121214" strokeWidth="2.2" strokeLinecap="round" pathLength={1} strokeDasharray="1" strokeDashoffset="1" style={{ animation: "dash 1.3s .3s forwards ease-out" }} />
        {peak?.n > 0 && <><circle cx={x(peakI)} cy={y(peak.n)} r="11" fill="#FF8A1C" fillOpacity=".25" /><circle cx={x(peakI)} cy={y(peak.n)} r="5.5" fill="#FF8A1C" stroke="#fff" strokeWidth="2" /></>}
        {h && <>
          <line x1={x(hover!)} x2={x(hover!)} y1={10} y2={BASE} stroke="#121214" strokeDasharray="3 4" />
          <circle cx={x(hover!)} cy={y(h.n)} r="6" fill="#FF8A1C" stroke="#121214" strokeWidth="2.5" />
          <circle cx={x(hover!)} cy={y(h.q)} r="5" fill="#121214" stroke="#fff" strokeWidth="2" />
        </>}
        {[0, Math.floor((points.length - 1) / 3), Math.floor(((points.length - 1) * 2) / 3), points.length - 1].map((i, k) => (
          <text key={k} x={x(i)} y={H - 6} fontSize="13" fill="#121214" fillOpacity=".55" textAnchor={k === 0 ? "start" : k === 3 ? "end" : "middle"}>{points[i]?.label}</text>
        ))}
      </svg>

      {h && (
        <div className="pointer-events-none absolute z-20 rounded-2xl bg-onyx px-4 py-2.5 text-chalk shadow-xl" style={{ bottom: "48%", left: `clamp(0px, calc(${(x(hover!) / W) * 100}% - 70px), calc(100% - 150px))` }}>
          <div className="text-[11px] text-chalk/60">{mode === "weekly" ? "Week of " : ""}{h.label}</div>
          <div className="flex items-center gap-2 text-sm font-bold"><span className="h-2 w-2 rounded-full bg-tangerine" />{h.n} <span className="font-normal text-chalk/60">new</span></div>
          <div className="flex items-center gap-2 text-sm font-bold"><span className="h-2 w-2 rounded-full bg-chalk" />{h.q} <span className="font-normal text-chalk/60">qualified</span></div>
        </div>
      )}

      {/* Floating cards (overlaid on large screens, stacked under the chart on small ones) */}
      <div className="mt-4 grid gap-3 sm:grid-cols-3 lg:contents">
        <div className={`glass-light p-4 lg:left-3 lg:top-2 lg:w-[235px] ${card}`}>
          <div className="mb-2 flex items-center justify-between text-xs"><b className="text-sm">Lead sources</b><span className="text-onyx/45">All time</span></div>
          <div className="space-y-2">
            {sources.length ? sources.map((s, i) => (
              <div key={s.k} className="flex items-center gap-2 text-[11px]">
                <span className="w-[68px] truncate capitalize">{s.k}</span>
                <span className="h-1.5 flex-1 rounded-full bg-onyx/10"><span className="block h-1.5 rounded-full transition-all duration-700" style={{ width: `${s.pct}%`, background: DOTS[i % DOTS.length] }} /></span>
                <b className="w-8 text-right">{s.pct}%</b>
              </div>
            )) : <p className="text-xs text-onyx/50">No source data yet.</p>}
          </div>
        </div>

        <div className={`glass-dark p-4 lg:left-[38%] lg:top-2 lg:w-[250px] ${card}`}>
          <div className="flex items-center justify-between text-xs text-chalk/70"><span>Best source</span><span className="capitalize text-chalk">{best ? pretty(best.k) : "—"} ↗</span></div>
          <div className="mt-1.5 text-4xl font-light">{best ? best.n : 0} <span className="text-xs text-chalk/60">{best?.label || "leads"}</span></div>
          <div className="mt-2 flex h-1.5 gap-1 overflow-hidden rounded-full">
            {(bestShares.length ? bestShares : [1]).map((v, i) => <span key={i} className="h-1.5 rounded-full" style={{ flex: v, background: ["#FF8A1C", "#FFC23D", "#F2F1EE"][i % 3] }} />)}
          </div>
        </div>

        <div className={`glass-light p-4 lg:right-3 lg:top-2 lg:w-[200px] ${card}`}>
          <div className="flex items-center justify-between text-xs"><b className="text-sm">{peak?.n ? `${mode === "weekly" ? "Week of " : ""}${peak.label}` : "No peak yet"}</b><span className="grid h-6 w-6 place-items-center rounded-full bg-onyx/10">↗</span></div>
          <div className="mt-0.5 text-[11px] text-onyx/50">New leads · peak {mode === "weekly" ? "week" : "day"}</div>
          <div className="mt-2 flex items-center gap-2 text-3xl font-light"><span className="h-3.5 w-3.5 rounded-full bg-tangerine ring-4 ring-tangerine/25" />{peak?.n || 0}</div>
        </div>
      </div>
    </div>
  );
}

export default function Overview() {
  const { openCreate, openImport, openLead, version } = useShell();
  const stats = useApi<any>("/api/stats");
  const leads = useApi<any[]>("/api/leads");
  const [mode, setMode] = useState<"daily" | "weekly">("daily");
  useEffect(() => { if (version) { stats.reload(); leads.reload(); } }, [version]); // eslint-disable-line

  const s = stats.data;
  const count = (k: string) => s?.byStatus.find((x: any) => x.k === k)?.n || 0;
  const points = useMemo(() => (s ? buildSeries(s.daily, mode) : []), [s, mode]);
  const sumN = points.reduce((a, p) => a + p.n, 0), sumQ = points.reduce((a, p) => a + p.q, 0);
  const qualifiedLeads = (s?.sourceQualified || []).reduce((a: number, x: any) => a + x.n, 0);
  const high = s?.byCategory.find((x: any) => x.k === "high_fit")?.n || 0;
  const sources = (s?.bySource || []).slice(0, 4).map((x: any) => ({ k: pretty(x.k), pct: Math.round((x.n / Math.max(s.total, 1)) * 100) }));
  const best = s ? (s.sourceQualified[0] ? { ...s.sourceQualified[0], label: "qualified leads" } : s.bySource[0] ? { ...s.bySource[0], label: "leads" } : null) : null;
  const bestShares = (s?.sourceQualified || []).slice(0, 3).map((x: any) => x.n);

  // Pipeline stage columns
  const stages: { k: string; n: number }[] = s ? ORDER.map((k) => ({ k, n: count(k) })).filter((x) => x.n > 0) : [];
  s?.byStatus.forEach((x: any) => { if (!ORDER.includes(x.k)) stages.push({ k: x.k, n: x.n }); });
  const shown = stages.slice(0, 6), rest = stages.slice(6).reduce((a, x) => a + x.n, 0);
  if (rest) shown.push({ k: "other", n: rest });
  const latest = (leads.data || []).slice(0, 10);
  const age = (d: any) => { const n = Math.max(0, Math.round((Date.now() - new Date(d).getTime()) / 86400000)); return n === 0 ? "today" : `${n}d`; };

  const insights: [string, string, string | number][] = s ? [
    ["trend", `${s.last7} new lead${s.last7 === 1 ? "" : "s"} arrived in the last 7 days.`, s.last7],
    ["link", s.bySource[0] ? `${pretty(s.bySource[0].k)} is your top lead source (${Math.round((s.bySource[0].n / Math.max(s.total, 1)) * 100)}% of all leads).` : "No lead source data yet.", `${s.bySource[0]?.n ?? 0}`],
    ["star", `${high} of ${s.qualified.n} AI assessments rated a lead high fit.`, s.qualified.n ? `${Math.round((high / s.qualified.n) * 100)}%` : "—"],
    ["clock", `Average AI qualification score across ${s.qualified.n} assessments.`, s.qualified.avg],
    ["user", `${s.unassigned} lead${s.unassigned === 1 ? " has" : "s have"} no sales owner yet.`, s.unassigned],
    ["mail", `${s.drafts.pending} follow-up draft${s.drafts.pending === 1 ? " is" : "s are"} waiting for approval.`, s.drafts.pending],
    ["building", s.topIndustry ? `${s.topIndustry.k} is your most common industry.` : "No industry data yet.", s.topIndustry?.n ?? 0],
  ] : [];

  return (
    <>
      <PageHeader title="Overview" subtitle="Track your leads and AI pipeline performance in one place.">
        <button className="btn-accent" onClick={openImport}>⬆ Import CSV</button>
        <button className="btn-dark" onClick={openCreate}>+ Create Lead</button>
      </PageHeader>
      {stats.error && <div className="mb-4"><Alert>{stats.error}. Check the Setup page for your environment variables.</Alert></div>}

      <div className="grid gap-4 xl:grid-cols-[290px_1fr]">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
          <div className="card p-6">
            <div className="text-xs font-semibold uppercase tracking-wide text-onyx/50">Total leads</div>
            <div className="mt-2 text-6xl font-extralight tracking-tight">{s ? s.total : <Spinner />}</div>
            <div className="mt-2 text-sm font-semibold text-tangerine-dark">{s ? `+${s.last7} in the last 7 days` : ""}</div>
            <div className="mt-5 flex h-14 items-end gap-[3px]">{(s?.daily.slice(-30) || []).map((d: any, i: number) => <span key={i} className="flex-1 rounded-sm bg-onyx/15 transition-all hover:bg-tangerine" style={{ height: `${Math.max(8, (d.n / Math.max(1, ...s.daily.map((x: any) => x.n))) * 100)}%`, background: i === 29 ? "#FF8A1C" : undefined }} />)}</div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[["Qualified", qualifiedLeads], ["High fit", high], ["Unassigned", s?.unassigned ?? 0], ["Drafts to review", s?.drafts.pending ?? 0]].map(([k, v], i) => (
              <div key={k as string} className="card p-5 transition hover:-translate-y-1"><div className={`mb-3 h-8 w-8 rounded-xl ${i === 0 ? "bg-tangerine" : "bg-onyx"}`} /><div className="text-3xl font-light">{v}</div><div className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-onyx/50">{k}</div></div>
            ))}
          </div>
        </div>

        <div className="card overflow-hidden bg-gradient-to-b from-paper via-paper to-tangerine/20 p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex gap-1 rounded-full bg-chalk-2 p-1">{([["daily", "Daily"], ["weekly", "Weekly"]] as const).map(([k, l]) => <button key={k} onClick={() => setMode(k)} className={`rounded-full px-4 py-1.5 text-xs font-bold transition ${mode === k ? "bg-onyx text-chalk" : "text-onyx/60 hover:text-onyx"}`}>{l}</button>)}</div>
              {[["#FF8A1C", "New leads", sumN], ["#121214", "Qualified", sumQ], ["#9A978F", "Won", count("won")]].map(([c, l, v]) => (
                <span key={l as string} className="chip border border-chalk-3 bg-white/70 text-onyx"><span className="h-2 w-2 rounded-full" style={{ background: c as string }} />{l} <b>{v}</b></span>
              ))}
            </div>
            <span className="text-xs text-onyx/45">{mode === "daily" ? "Last 30 days" : "Last 12 weeks"}</span>
          </div>
          {s ? <LeadsChart key={mode} points={points} mode={mode} sources={sources} best={best} bestShares={bestShares} /> : <div className="grid h-72 place-items-center"><Spinner className="h-6 w-6" /></div>}
        </div>
      </div>

      <div className="zone mt-4 space-y-4">
        <div className="grid gap-4 lg:grid-cols-[1.45fr_1fr]">
          <div className="glass-dark p-6">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-2xl font-light">Sales pipeline</h2>
              <div className="flex items-center gap-2">
                <span className="chip border border-white/20 bg-white/10 text-chalk/85">{s?.total ?? 0} leads · {(s?.total ?? 0) - (s?.unassigned ?? 0)} assigned</span>
                <button onClick={openCreate} className="grid h-9 w-9 place-items-center rounded-full bg-chalk text-onyx transition hover:rotate-90 hover:bg-tangerine" aria-label="Create lead">+</button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-x-5 gap-y-4 sm:grid-cols-3 xl:grid-cols-6">
              {shown.map((st) => (
                <Link key={st.k} href={st.k === "other" ? "/dashboard/leads" : `/dashboard/leads?status=${encodeURIComponent(st.k)}`} className="group block">
                  <div className="text-4xl font-extralight transition group-hover:text-tangerine">{st.n}</div>
                  <div className="mt-0.5 text-xs capitalize text-chalk/70">{pretty(st.k)}</div>
                  <div className="mt-2 h-[3px] rounded-full bg-white/20"><div className="h-[3px] rounded-full bg-tangerine transition-all duration-700" style={{ width: `${Math.max(6, (st.n / Math.max(s.total, 1)) * 100)}%` }} /></div>
                  <div className="mt-1 text-[10px] text-chalk/50">{Math.round((st.n / Math.max(s.total, 1)) * 100)}% of leads</div>
                </Link>
              ))}
              {!s && <Spinner className="text-chalk" />}
            </div>
            <div className="mb-3 mt-6 text-xs font-semibold uppercase tracking-wide text-chalk/50">Latest leads</div>
            <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 xl:grid-cols-5">
              {latest.map((l) => (
                <button key={l.id} onClick={() => openLead(l.id)} className="rounded-2xl border border-white/15 bg-white/10 p-3 text-left transition duration-200 hover:-translate-y-1 hover:bg-white/20">
                  <div className="mb-2 flex items-center gap-2"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-white/25 text-[10px] font-bold">{initials(l.contact_name)}</span><span className="truncate text-xs font-semibold">{l.company || l.contact_name}</span></div>
                  <div className="flex items-center justify-between text-[11px] text-chalk/65"><span className="truncate">{l.industry || pretty(l.status || "new")}</span><span className="ml-2 shrink-0">{age(l.created_at)}</span></div>
                </button>
              ))}
              {leads.data && !latest.length && <p className="col-span-full text-sm text-chalk/60">No leads yet.</p>}
            </div>
          </div>

          <div className="glass-dark p-6">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-full bg-tangerine text-onyx">✦</span><h2 className="text-2xl font-light">AI sales insights</h2></div>
              <Link href="/dashboard/activity" className="btn btn-sm bg-chalk text-onyx hover:bg-tangerine">View all →</Link>
            </div>
            <ul className="space-y-2.5">
              {insights.map(([ic, text, val], i) => (
                <li key={i} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 transition duration-200 hover:translate-x-1 hover:bg-white/20">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/15"><Ico k={ic} /></span>
                  <span className="flex-1 text-[13px] leading-snug text-chalk/90">{text}</span>
                  <b className="shrink-0 border-b-2 border-tangerine text-lg font-medium leading-tight">{val}</b>
                </li>
              ))}
              {!s && <Spinner className="text-chalk" />}
            </ul>
          </div>
        </div>

        <div className="glass-light p-6">
          <div className="mb-4 flex items-center justify-between"><h2 className="flex items-center gap-2 text-xl font-bold">Recent leads <span className="chip bg-onyx text-chalk">{s?.total ?? 0}</span></h2><Link href="/dashboard/leads" className="btn-dark btn-sm">View all →</Link></div>
          <div className="overflow-x-auto">
            <table className="w-full"><thead><tr>{["Contact", "Company", "Industry", "Source", "Status", "Added"].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
              <tbody>
                {(leads.data || []).slice(0, 6).map((l) => (
                  <tr key={l.id} onClick={() => openLead(l.id)} className="cursor-pointer border-t border-onyx/10 transition hover:bg-white/70">
                    <td className="td"><div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-full bg-onyx text-xs font-bold text-chalk">{initials(l.contact_name)}</span><div><div className="font-semibold">{l.contact_name}</div><div className="text-xs text-onyx/50">{l.email}</div></div></div></td>
                    <td className="td">{l.company || "—"}</td><td className="td">{l.industry || "—"}</td>
                    <td className="td"><span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full" style={{ background: dotFor(l.source) }} />{pretty(l.source || "—")}</span></td>
                    <td className="td"><Badge value={l.status} /></td><td className="td text-onyx/60">{fmtDate(l.created_at)}</td>
                  </tr>
                ))}
                {leads.data?.length === 0 && <tr><td colSpan={6} className="td py-10 text-center text-onyx/50">No leads yet. Import a CSV or create your first lead.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
