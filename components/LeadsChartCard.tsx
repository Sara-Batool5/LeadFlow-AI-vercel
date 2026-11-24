"use client";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { Spinner } from "./ui";

type Lead = { created_at: string; source?: string; status?: string; priority?: string };
type Mode = "week" | "month";

// "Qualified" = AI fit of medium or better, or a status of qualified / won. "Converted" = status won.
const isQualified = (l: Lead) => ["high", "urgent", "medium"].includes((l.priority || "").toLowerCase()) || ["qualified", "won"].includes((l.status || "").toLowerCase());
const isWon = (l: Lead) => (l.status || "").toLowerCase() === "won";

const LEVELS: Record<Mode, number[]> = { week: [4, 8, 12, 26], month: [3, 6, 12] };
const SRC = ["#FF8A1C", "#FFC145", "#121214", "#B9B6AE"];
const pretty = (s: string) => s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

function startOf(d: Date, mode: Mode) {
  const x = new Date(d); x.setHours(0, 0, 0, 0);
  if (mode === "week") x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); else x.setDate(1);
  return x;
}
function shift(d: Date, mode: Mode, k: number) {
  const x = new Date(d);
  if (mode === "week") x.setDate(x.getDate() + 7 * k); else x.setMonth(x.getMonth() + k);
  return x;
}

// Monotone cubic smoothing: smooth curves that never dip below zero between points.
function smooth(p: [number, number][]) {
  const n = p.length;
  if (n < 2) return n ? `M${p[0][0]},${p[0][1]}` : "";
  const dx: number[] = [], m: number[] = [], t: number[] = new Array(n).fill(0);
  for (let i = 0; i < n - 1; i++) { dx[i] = p[i + 1][0] - p[i][0]; m[i] = (p[i + 1][1] - p[i][1]) / dx[i]; }
  t[0] = m[0]; t[n - 1] = m[n - 2];
  for (let i = 1; i < n - 1; i++) t[i] = m[i - 1] * m[i] <= 0 ? 0 : (m[i - 1] + m[i]) / 2;
  for (let i = 0; i < n - 1; i++) {
    if (m[i] === 0) { t[i] = 0; t[i + 1] = 0; continue; }
    const a = t[i] / m[i], b = t[i + 1] / m[i], s = a * a + b * b;
    if (s > 9) { const k = 3 / Math.sqrt(s); t[i] = k * a * m[i]; t[i + 1] = k * b * m[i]; }
  }
  let d = `M${p[0][0]},${p[0][1]}`;
  for (let i = 0; i < n - 1; i++) { const h = dx[i] / 3; d += ` C${p[i][0] + h},${p[i][1] + t[i] * h} ${p[i + 1][0] - h},${p[i + 1][1] - t[i + 1] * h} ${p[i + 1][0]},${p[i + 1][1]}`; }
  return d;
}

export default function LeadsChartCard({ leads, loading }: { leads: Lead[] | null; loading: boolean }) {
  const [mode, setMode] = useState<Mode>("week");
  const [lvl, setLvl] = useState<Record<Mode, number>>({ week: 2, month: 1 });
  const [show, setShow] = useState({ n: true, q: true, c: true });
  const [hover, setHover] = useState<number | null>(null);
  const box = useRef<HTMLDivElement>(null);

  const count = LEVELS[mode][lvl[mode]];

  const d = useMemo(() => {
    const cur = startOf(new Date(), mode);
    const starts = Array.from({ length: count }, (_, i) => shift(cur, mode, i - (count - 1)));
    const buckets = starts.map((s) => ({
      start: s, n: 0, q: 0, c: 0,
      label: mode === "week" ? s.toLocaleDateString("en-US", { month: "short", day: "numeric" }) : s.toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
      title: mode === "week" ? `Week of ${s.toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : s.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
    }));
    const src = new Map<string, number>(), srcQ = new Map<string, number>();
    const end = shift(starts[count - 1], mode, 1).getTime();
    for (const l of leads || []) {
      const ts = new Date(l.created_at).getTime();
      if (!(ts >= starts[0].getTime() && ts < end)) continue;
      let idx = 0;
      for (let i = 0; i < count; i++) if (ts >= starts[i].getTime()) idx = i;
      const b = buckets[idx], key = (l.source || "unknown").trim() || "unknown";
      b.n++; src.set(key, (src.get(key) || 0) + 1);
      if (isQualified(l)) { b.q++; srcQ.set(key, (srcQ.get(key) || 0) + 1); }
      if (isWon(l)) b.c++;
    }
    const top = (m: Map<string, number>) => [...m.entries()].sort((a, b) => b[1] - a[1]);
    return { buckets, sources: top(src), qualSources: top(srcQ), total: buckets.reduce((s, b) => s + b.n, 0), totalQ: buckets.reduce((s, b) => s + b.q, 0), totalC: buckets.reduce((s, b) => s + b.c, 0) };
  }, [leads, mode, count]);

  const W = 900, H = 260, PL = 28, PR = 28, PT = 18, PB = 30;
  const step = (W - PL - PR) / Math.max(count - 1, 1);
  const x = (i: number) => PL + i * step;
  const maxV = Math.max(1, ...d.buckets.flatMap((b) => [show.n ? b.n : 0, show.q ? b.q : 0, show.c ? b.c : 0]));
  const yMax = Math.max(3, Math.ceil(maxV * 1.2));
  const y = (v: number) => H - PB - (v / yMax) * (H - PB - PT);
  const pts = (k: "n" | "q" | "c") => d.buckets.map((b, i) => [x(i), y(b[k])] as [number, number]);
  const peak = d.buckets.reduce((bi, b, i, a) => (b.n > a[bi].n ? i : bi), d.buckets.length - 1);
  const active = hover ?? peak;
  const ab = d.buckets[active];
  const every = Math.ceil(count / 7);

  const onMove = (e: React.PointerEvent) => {
    const r = box.current!.getBoundingClientRect();
    const i = Math.round((((e.clientX - r.left) / r.width) * W - PL) / step);
    setHover(Math.max(0, Math.min(count - 1, i)));
  };
  const zoom = (dir: number) => setLvl({ ...lvl, [mode]: Math.max(0, Math.min(LEVELS[mode].length - 1, lvl[mode] + dir)) });

  const chip = (k: "n" | "q" | "c", label: string, val: number, dot: string) => (
    <button key={k} onClick={() => setShow({ ...show, [k]: !show[k] })} className={`flex items-center gap-2 rounded-full border border-chalk-3 bg-white px-3.5 py-1.5 text-xs font-semibold transition hover:border-onyx ${show[k] ? "" : "opacity-40"}`}>
      <span className="h-2 w-2 rounded-full" style={{ background: dot }} />{label} <b className="text-sm">{val.toLocaleString()}</b>
    </button>
  );

  const range = mode === "week" ? `Last ${count} weeks` : `Last ${count} months`;
  const srcTotal = d.sources.reduce((s, r) => s + r[1], 0) || 1;
  const bestSrc = d.qualSources[0];
  const qTotal = d.qualSources.reduce((s, r) => s + r[1], 0) || 1;
  const flip = (x(active) / W) > 0.62;

  return (
    <div className="card flex flex-col overflow-hidden p-5 md:p-6" style={{ background: "linear-gradient(180deg,#FAF9F7 52%,#FFE7CF 100%)" }}>
      <div className="mb-4 flex flex-wrap items-center gap-2.5">
        <div className="flex gap-1 rounded-full bg-chalk-2 p-1">
          {([["week", "Weekly"], ["month", "Monthly"]] as [Mode, string][]).map(([m, l]) => (
            <button key={m} onClick={() => { setMode(m); setHover(null); }} className={`rounded-full px-4 py-1.5 text-xs font-bold transition ${mode === m ? "bg-onyx text-chalk" : "text-onyx/60 hover:text-onyx"}`}>{l}</button>
          ))}
        </div>
        {chip("n", "New leads", d.total, "#FF8A1C")}
        {chip("q", "Qualified", d.totalQ, "#121214")}
        {chip("c", "Converted", d.totalC, "#B9B6AE")}
      </div>

      {loading && !leads ? <div className="grid h-64 place-items-center"><Spinner className="h-6 w-6" /></div> : (
        <div ref={box} className="relative" onPointerMove={onMove} onPointerLeave={() => setHover(null)}>
          <svg viewBox={`0 0 ${W} ${H}`} className="block w-full">
            <defs><linearGradient id="lfArea" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#FF8A1C" stopOpacity=".38" /><stop offset="1" stopColor="#FF8A1C" stopOpacity="0" /></linearGradient></defs>
            {d.buckets.map((_, i) => <line key={i} x1={x(i)} x2={x(i)} y1={PT - 6} y2={H - PB} stroke="#D9D6CF" opacity=".55" />)}
            <line x1={PL} x2={W - PR} y1={H - PB} y2={H - PB} stroke="#121214" strokeOpacity=".35" strokeDasharray="4 5" />
            <g key={`${mode}-${count}-${show.n}-${show.q}-${show.c}`}>
              {show.n && <path d={`${smooth(pts("n"))} L${x(count - 1)},${H - PB} L${x(0)},${H - PB} Z`} fill="url(#lfArea)" />}
              {([["c", "#9C9990", 2, "5 5"], ["q", "#121214", 2.5, ""], ["n", "#FF8A1C", 3.5, ""]] as [("n" | "q" | "c"), string, number, string][]).map(([k, col, w, dash]) => show[k] && (
                <path key={k} d={smooth(pts(k))} fill="none" stroke={col} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={dash || undefined} />
              ))}
            </g>
            <line x1={x(active)} x2={x(active)} y1={PT - 6} y2={H - PB} stroke="#121214" strokeDasharray="3 4" />
            {show.c && <circle cx={x(active)} cy={y(ab.c)} r="4.5" fill="#9C9990" stroke="#FAF9F7" strokeWidth="2" />}
            {show.q && <circle cx={x(active)} cy={y(ab.q)} r="5" fill="#121214" stroke="#FAF9F7" strokeWidth="2" />}
            {show.n && <circle cx={x(active)} cy={y(ab.n)} r="6" fill="#FF8A1C" stroke="#121214" strokeWidth="2.5" />}
            {d.buckets.map((b, i) => (i % every === 0 || i === count - 1) && <text key={i} x={x(i)} y={H - 8} fontSize="12" fill="#12121499" textAnchor={i === 0 ? "start" : i === count - 1 ? "end" : "middle"}>{b.label}</text>)}
          </svg>

          <div className="pointer-events-none absolute z-10 w-44 rounded-3xl bg-paper/95 p-3.5 shadow-soft ring-1 ring-black/5 backdrop-blur transition-[left,top] duration-200"
            style={{ left: `${(x(active) / W) * 100}%`, top: `clamp(4px, calc(${(y(show.n ? ab.n : ab.q) / H) * 100}% - 44px), calc(100% - 118px))`, transform: flip ? "translateX(calc(-100% - 16px))" : "translateX(16px)" }}>
            <div className="text-xs font-bold">{ab.title}</div>
            <div className="text-[11px] text-onyx/50">New leads{hover === null && active === peak && d.total > 0 ? " · peak" : ""}</div>
            <div className="mt-1 flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-tangerine" /><span className="text-3xl font-light leading-none">{ab.n}</span></div>
            <div className="mt-2 flex gap-3 text-[11px] text-onyx/60"><span>Qualified <b className="text-onyx">{ab.q}</b></span><span>Converted <b className="text-onyx">{ab.c}</b></span></div>
          </div>

          <div className="absolute right-0 top-1/2 flex -translate-y-1/2 flex-col gap-2">
            {[["+", -1, lvl[mode] === 0], ["−", 1, lvl[mode] === LEVELS[mode].length - 1]].map(([s, dir, off]) => (
              <button key={s as string} disabled={off as boolean} onClick={() => zoom(dir as number)} aria-label={dir === -1 ? "Zoom in" : "Zoom out"} className="grid h-9 w-9 place-items-center rounded-full bg-white text-lg font-semibold shadow-soft transition hover:bg-onyx hover:text-chalk disabled:opacity-30 disabled:hover:bg-white disabled:hover:text-onyx">{s}</button>
            ))}
          </div>
        </div>
      )}

      <div className="mt-auto grid gap-3 pt-5 sm:grid-cols-2">
        <div className="rounded-3xl bg-white/90 p-4 shadow-soft">
          <div className="mb-3 flex items-center justify-between"><span className="text-sm font-bold">Lead sources</span><span className="text-[11px] text-onyx/45">{range}</span></div>
          {d.sources.length ? d.sources.slice(0, 4).map(([name, n], i) => {
            const pct = Math.round((n / srcTotal) * 100);
            return (
              <div key={name} className="group mb-2 grid grid-cols-[84px_1fr_36px] items-center gap-2 text-xs last:mb-0">
                <span className="truncate text-onyx/70">{pretty(name)}</span>
                <div className="h-1.5 rounded-full bg-chalk-2"><div className="h-1.5 rounded-full transition-all duration-700 group-hover:brightness-110" style={{ width: `${pct}%`, background: SRC[i] }} /></div>
                <b className="text-right">{pct}%</b>
              </div>
            );
          }) : <p className="text-xs text-onyx/50">No leads in this period.</p>}
        </div>
        <Link href="/dashboard/leads" className="group rounded-3xl bg-onyx p-4 text-chalk shadow-soft transition hover:-translate-y-0.5">
          <div className="flex items-center justify-between text-xs text-chalk/60"><span>Best source</span><span className="text-sm font-semibold text-chalk">{bestSrc ? pretty(bestSrc[0]) : "—"} <span className="inline-block transition group-hover:translate-x-1">→</span></span></div>
          <div className="mt-2 flex items-end gap-2"><span className="text-4xl font-light leading-none">{bestSrc ? bestSrc[1].toLocaleString() : 0}</span><span className="pb-0.5 text-xs text-chalk/60">qualified leads</span></div>
          <div className="mt-4 flex h-2 gap-1 overflow-hidden rounded-full">
            {d.qualSources.slice(0, 3).map(([n, v], i) => <span key={n} className="h-2 rounded-full" style={{ width: `${(v / qTotal) * 100}%`, background: ["#FF8A1C", "#FFC145", "#8A8A92"][i] }} />)}
            {!d.qualSources.length && <span className="h-2 w-full rounded-full bg-white/10" />}
          </div>
        </Link>
      </div>
    </div>
  );
}
