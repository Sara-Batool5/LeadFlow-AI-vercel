"use client";
import { useRef } from "react";

const BARS = [38, 55, 42, 70, 52, 88, 64, 46, 74, 58, 92, 66, 80, 60];

// A stylised product preview that tilts toward the cursor.
export default function HeroPreview() {
  const ref = useRef<HTMLDivElement>(null);
  const move = (e: React.PointerEvent) => {
    const el = ref.current!, r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `perspective(1200px) rotateY(${x * 6}deg) rotateX(${-y * 5}deg)`;
  };
  const reset = () => { if (ref.current) ref.current.style.transform = "perspective(1200px)"; };
  return (
    <div className="relative mx-auto mt-14 max-w-5xl px-2" onPointerMove={move} onPointerLeave={reset}>
      <div className="absolute inset-x-10 -bottom-6 top-10 rounded-[40px] bg-tangerine/40 blur-3xl" />
      <div ref={ref} className="relative rounded-[28px] border-4 border-tangerine/80 bg-paper p-3 shadow-2xl transition-transform duration-200 ease-out">
        <div className="grid gap-3 md:grid-cols-[170px_1fr]">
          <div className="hidden rounded-2xl bg-onyx p-4 text-chalk md:block">
            <div className="mb-5 flex items-center gap-2 text-sm font-bold"><span className="h-6 w-6 rounded-lg bg-tangerine" />LeadFlow AI</div>
            {["Overview", "Leads", "Workflow", "Review", "Team", "Activity"].map((n, i) => (
              <div key={n} className={`mb-1.5 rounded-xl px-3 py-2 text-xs font-semibold ${i === 0 ? "bg-tangerine text-onyx" : "text-chalk/60"}`}>{n}</div>
            ))}
          </div>
          <div className="space-y-3 text-left">
            <div className="grid grid-cols-3 gap-3">
              {[["Total leads", "1,248"], ["Qualified", "412"], ["Drafts to review", "24"]].map(([k, v]) => (
                <div key={k} className="rounded-2xl bg-chalk p-3"><div className="text-[10px] font-semibold uppercase text-onyx/50">{k}</div><div className="mt-1 text-xl font-extrabold">{v}</div></div>
              ))}
            </div>
            <div className="grid gap-3 md:grid-cols-[1fr_190px]">
              <div className="rounded-2xl bg-chalk p-4">
                <div className="mb-3 text-xs font-bold">Leads per day</div>
                <div className="flex h-36 items-end gap-1.5">
                  {BARS.map((b, i) => (
                    <div key={i} className="group relative flex-1 origin-bottom rounded-t-md bg-onyx/15 transition-colors hover:bg-tangerine" style={{ height: `${b}%`, animation: `grow .8s ${i * 50}ms both cubic-bezier(.2,.7,.2,1)`, background: i === 10 ? "#FF8A1C" : undefined }} />
                  ))}
                </div>
              </div>
              <div className="rounded-2xl bg-chalk p-4">
                <div className="mb-3 text-xs font-bold">Lead fit</div>
                <div className="mx-auto grid h-28 w-28 place-items-center rounded-full" style={{ background: "conic-gradient(#FF8A1C 0 46%, #121214 46% 78%, #D9D6CF 78% 100%)" }}>
                  <div className="grid h-[70px] w-[70px] place-items-center rounded-full bg-chalk text-lg font-extrabold">46%</div>
                </div>
                <div className="mt-3 text-center text-[10px] text-onyx/50">high-fit leads</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
