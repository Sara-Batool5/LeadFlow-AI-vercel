"use client";
import { useMemo, useRef } from "react";

// A scaled-down replica of the real dashboard Overview (sample data), cropped at the bottom.
const N = [1, 0, 2, 1, 0, 3, 5, 2, 1, 0, 2, 4, 9, 14, 8, 3, 2, 4, 3, 5, 4, 2, 1, 0, 2, 3, 2, 1, 2, 1];
const Q = [0, 0, 1, 0, 0, 1, 2, 1, 0, 0, 1, 2, 5, 8, 4, 1, 1, 2, 1, 2, 2, 1, 0, 0, 1, 1, 1, 0, 1, 0];
const W = 900, H = 250, P = 12, BASE = H - 26;

function smooth(pts: [number, number][]) {
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2, t = 0.18;
    d += ` C${p1[0] + (p2[0] - p0[0]) * t},${Math.min(BASE, p1[1] + (p2[1] - p0[1]) * t)} ${p2[0] - (p3[0] - p1[0]) * t},${Math.min(BASE, p2[1] - (p3[1] - p1[1]) * t)} ${p2[0]},${p2[1]}`;
  }
  return d;
}

const NAV = ["Overview", "Leads", "Agent Workflow", "Human Review", "Sales Team", "Activity & Audit", "Setup"];
const STAGES = [["54", "New"], ["6", "Assigned"], ["12", "Qualified"], ["9", "In progress"], ["4", "Won"]];
const LATEST = [["HelixPoint Genomics", "Biotechnology", "2d"], ["NovaSphere Research", "Biotechnology", "3d"], ["Northwind Labs", "SaaS", "4d"], ["Quanta Health", "Healthcare", "5d"], ["Helio Systems", "Fintech", "6d"]];

export default function HeroPreview() {
  const ref = useRef<HTMLDivElement>(null);
  const { nLine, qLine, area, peak } = useMemo(() => {
    const x = (i: number) => P + (i * (W - 2 * P)) / (N.length - 1), y = (v: number) => BASE - (v / 32) * (BASE - 20);
    const n = N.map((v, i) => [x(i), y(v)] as [number, number]), q = Q.map((v, i) => [x(i), y(v)] as [number, number]);
    const nl = smooth(n);
    return { nLine: nl, qLine: smooth(q), area: `${nl} L${x(N.length - 1)},${BASE} L${x(0)},${BASE} Z`, peak: n[13] };
  }, []);

  const move = (e: React.PointerEvent) => {
    const el = ref.current!, r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `perspective(1400px) rotateY(${x * 5}deg) rotateX(${-y * 4}deg)`;
  };
  const reset = () => { if (ref.current) ref.current.style.transform = "perspective(1400px)"; };

  return (
    <div className="relative mx-auto mt-14 max-w-6xl px-2" onPointerMove={move} onPointerLeave={reset}>
      <div className="absolute inset-x-10 -bottom-6 top-10 rounded-[40px] bg-tangerine/40 blur-3xl" />
      <div ref={ref} className="relative max-h-[560px] overflow-hidden rounded-[30px] border-4 border-tangerine/80 bg-chalk p-3 text-left shadow-2xl transition-transform duration-200 ease-out md:max-h-[640px]">
        <div className="grid gap-3 md:grid-cols-[190px_1fr]">
          {/* sidebar */}
          <aside className="hidden flex-col rounded-3xl bg-paper p-3 shadow-soft md:flex">
            <div className="mb-4 flex items-center gap-2 px-1 text-sm font-extrabold"><span className="grid h-8 w-8 place-items-center rounded-xl bg-tangerine"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#121214" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12h6l3-7 3 14 3-7h1" /></svg></span>LeadFlow <span className="-ml-1 text-tangerine">AI</span></div>
            {NAV.map((n, i) => <div key={n} className={`mb-1 rounded-2xl px-3 py-2 text-[11px] font-semibold ${i === 0 ? "bg-onyx text-chalk" : "text-onyx/60"}`}>{n}</div>)}
            <div className="mt-24 rounded-full bg-tangerine py-2 text-center text-[11px] font-bold">⬆ Import CSV</div>
          </aside>

          <div className="min-w-0 space-y-3">
            <div className="flex items-end justify-between gap-3">
              <div><div className="text-3xl font-light tracking-tight">Overview</div><div className="text-[11px] text-onyx/55">Track your leads and AI pipeline performance in one place.</div></div>
              <div className="flex gap-2 text-[11px] font-bold"><span className="rounded-full bg-tangerine px-3 py-2 shadow-glow">⬆ Import CSV</span><span className="rounded-full bg-onyx px-3 py-2 text-chalk">+ Create Lead</span></div>
            </div>

            <div className="grid gap-3 lg:grid-cols-[170px_1fr]">
              <div className="hidden grid-cols-2 gap-2 lg:grid lg:grid-cols-1">
                <div className="rounded-3xl bg-paper p-4 shadow-soft"><div className="text-[9px] font-semibold uppercase text-onyx/50">Total leads</div><div className="text-4xl font-extralight">1,248</div><div className="text-[10px] font-semibold text-tangerine-dark">+86 in the last 7 days</div>
                  <div className="mt-3 flex h-8 items-end gap-[2px]">{N.map((v, i) => <span key={i} className="flex-1 rounded-sm bg-onyx/15" style={{ height: `${Math.max(10, (v / 14) * 100)}%`, background: i === 29 ? "#FF8A1C" : undefined }} />)}</div></div>
                <div className="grid grid-cols-2 gap-2">{[["412", "Qualified"], ["186", "High fit"]].map(([v, k], i) => <div key={k} className="rounded-2xl bg-paper p-3 shadow-soft"><div className={`mb-1.5 h-5 w-5 rounded-lg ${i ? "bg-onyx" : "bg-tangerine"}`} /><div className="text-xl font-light">{v}</div><div className="text-[8px] font-semibold uppercase text-onyx/50">{k}</div></div>)}</div>
              </div>

              <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-paper via-paper to-tangerine/20 p-4 shadow-soft">
                <div className="mb-2 flex flex-wrap items-center gap-1.5 text-[10px] font-bold">
                  <span className="flex gap-1 rounded-full bg-chalk-2 p-0.5"><span className="rounded-full bg-onyx px-3 py-1 text-chalk">Daily</span><span className="px-3 py-1 text-onyx/50">Weekly</span></span>
                  {[["#FF8A1C", "New leads", "62"], ["#121214", "Qualified", "33"], ["#9A978F", "Won", "4"]].map(([c, l, v]) => <span key={l} className="inline-flex items-center gap-1 rounded-full border border-chalk-3 bg-white/70 px-2.5 py-1"><span className="h-1.5 w-1.5 rounded-full" style={{ background: c }} />{l} {v}</span>)}
                </div>
                <div className="relative">
                  <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
                    <defs><linearGradient id="hp" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#FF8A1C" stopOpacity=".55" /><stop offset="1" stopColor="#FF8A1C" stopOpacity="0" /></linearGradient></defs>
                    {[0, 3, 6, 9, 12, 15, 18, 21, 24, 27].map((i) => <line key={i} x1={P + (i * (W - 2 * P)) / 29} x2={P + (i * (W - 2 * P)) / 29} y1="8" y2={BASE} stroke="#121214" strokeOpacity=".07" />)}
                    <line x1={P} x2={W - P} y1={BASE} y2={BASE} stroke="#121214" strokeOpacity=".35" strokeDasharray="5 6" />
                    <path d={area} fill="url(#hp)" /><path d={nLine} fill="none" stroke="#FF8A1C" strokeWidth="3" strokeLinecap="round" /><path d={qLine} fill="none" stroke="#121214" strokeWidth="2.2" strokeLinecap="round" />
                    <circle cx={peak[0]} cy={peak[1]} r="10" fill="#FF8A1C" fillOpacity=".25" /><circle cx={peak[0]} cy={peak[1]} r="5" fill="#FF8A1C" stroke="#fff" strokeWidth="2" />
                  </svg>
                  <div className="absolute left-1 top-0 hidden w-40 rounded-2xl border border-white/70 bg-white/80 p-2.5 text-[9px] shadow-soft backdrop-blur md:block">
                    <b className="text-[11px]">Lead sources</b>
                    {[["Website form", 58, "#FF8A1C"], ["LinkedIn", 22, "#121214"], ["Referral", 12, "#FFC23D"]].map(([k, p, c]) => <div key={k as string} className="mt-1.5 flex items-center gap-1.5"><span className="w-14 truncate">{k}</span><span className="h-1 flex-1 rounded-full bg-onyx/10"><span className="block h-1 rounded-full" style={{ width: `${p}%`, background: c as string }} /></span><b>{p}%</b></div>)}
                  </div>
                  <div className="absolute left-[40%] top-0 hidden w-44 rounded-2xl border border-white/15 p-2.5 text-[9px] text-chalk shadow-soft backdrop-blur md:block" style={{ background: "linear-gradient(135deg,rgba(255,255,255,.1),transparent 60%),rgba(18,18,20,.8)" }}>
                    <div className="flex justify-between text-chalk/70"><span>Best source</span><span className="text-chalk">Website form ↗</span></div><div className="text-3xl font-light">29 <span className="text-[9px] text-chalk/60">qualified leads</span></div>
                    <div className="mt-1 flex h-1 gap-1"><span className="flex-[6] rounded-full bg-tangerine" /><span className="flex-[2] rounded-full bg-[#FFC23D]" /><span className="flex-1 rounded-full bg-chalk" /></div>
                  </div>
                  <div className="absolute right-1 top-0 hidden w-32 rounded-2xl border border-white/70 bg-white/80 p-2.5 text-[9px] shadow-soft backdrop-blur md:block"><b className="text-[11px]">5 Nov</b><div className="text-onyx/50">New leads · peak day</div><div className="mt-1 flex items-center gap-1.5 text-2xl font-light"><span className="h-2.5 w-2.5 rounded-full bg-tangerine ring-4 ring-tangerine/25" />14</div></div>
                </div>
              </div>
            </div>

            {/* glass zone (cropped) */}
            <div className="rounded-[28px] p-3" style={{ background: "radial-gradient(420px 220px at 12% 8%, rgba(255,214,150,.75), transparent 70%), radial-gradient(420px 260px at 92% 38%, rgba(255,120,10,.55), transparent 70%), linear-gradient(180deg, rgba(255,138,28,.10), rgba(255,138,28,.6) 50%, #FF8A1C)" }}>
              <div className="grid gap-3 lg:grid-cols-[1.45fr_1fr]">
                <div className="rounded-3xl border border-white/15 p-4 text-chalk shadow-soft backdrop-blur-xl" style={{ background: "linear-gradient(135deg,rgba(255,255,255,.1),transparent 60%),rgba(18,18,20,.78)" }}>
                  <div className="mb-3 flex items-center justify-between"><span className="text-xl font-light">Sales pipeline</span><span className="rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-[9px]">1,248 leads · 612 assigned</span></div>
                  <div className="grid grid-cols-5 gap-3">{STAGES.map(([n, l]) => <div key={l}><div className="text-3xl font-extralight">{n}</div><div className="text-[10px] text-chalk/70">{l}</div><div className="mt-1.5 h-[3px] rounded-full bg-white/20"><div className="h-[3px] rounded-full bg-tangerine" style={{ width: `${Math.min(100, Number(n) * 1.6 + 8)}%` }} /></div></div>)}</div>
                  <div className="mt-4 grid grid-cols-5 gap-2">{LATEST.map(([c, i, a]) => <div key={c} className="rounded-xl border border-white/15 bg-white/10 p-2"><div className="truncate text-[10px] font-semibold">{c}</div><div className="mt-1 flex justify-between text-[9px] text-chalk/60"><span>{i}</span><span>{a}</span></div></div>)}</div>
                </div>
                <div className="hidden rounded-3xl border border-white/15 p-4 text-chalk shadow-soft backdrop-blur-xl lg:block" style={{ background: "linear-gradient(135deg,rgba(255,255,255,.1),transparent 60%),rgba(18,18,20,.78)" }}>
                  <div className="mb-3 flex items-center gap-2"><span className="grid h-8 w-8 place-items-center rounded-full bg-tangerine text-onyx">✦</span><span className="text-xl font-light">AI sales insights</span></div>
                  {["86 new leads arrived in the last 7 days.", "Website form is your top lead source.", "186 of 412 assessments rated high fit."].map((t, i) => <div key={t} className="mb-1.5 flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/[.07] px-3 py-2 text-[10px]"><span>{t}</span><b className="border-b-2 border-tangerine text-sm">{["86", "58%", "45%"][i]}</b></div>)}
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-chalk via-chalk/80 to-transparent" />
      </div>
      <p className="mt-3 text-center text-[11px] text-onyx/40">Preview with sample data</p>
    </div>
  );
}
