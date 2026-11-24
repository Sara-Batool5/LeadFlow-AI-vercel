"use client";
import { useEffect, useRef } from "react";

// Colourful named cursors (one per AI agent). They float on their own and, when the
// real cursor comes near, they swarm around it and turn to face it; they drift home when it leaves.
const ARROWS = [
  { name: "Intake", color: "#8B5CF6", x: 0.1, y: 0.27 },
  { name: "Qualifier", color: "#22C55E", x: 0.9, y: 0.19 },
  { name: "Router", color: "#3B82F6", x: 0.07, y: 0.74 },
  { name: "Drafter", color: "#FF8A1C", x: 0.94, y: 0.68 },
];

export default function CursorArrows() {
  const box = useRef<HTMLDivElement>(null);
  const nodes = useRef<(HTMLDivElement | null)[]>([]);
  const tips = useRef<(SVGSVGElement | null)[]>([]);

  useEffect(() => {
    const el = box.current!;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const st = ARROWS.map(() => ({ x: 0, y: 0, vx: 0, vy: 0, rot: 0, ready: false }));
    let mx = -1e4, my = -1e4, raf = 0;

    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      const r = el.getBoundingClientRect();
      mx = e.clientX - r.left; my = e.clientY - r.top;
    };
    const onLeave = () => { mx = -1e4; my = -1e4; };
    window.addEventListener("pointermove", onMove);
    document.documentElement.addEventListener("pointerleave", onLeave);

    const frame = (ms: number) => {
      const t = reduce ? 0 : ms / 1000, w = el.clientWidth, h = el.clientHeight;
      const inside = mx > -150 && mx < w + 150 && my > -150 && my < h + 150;
      ARROWS.forEach((a, i) => {
        const s = st[i];
        const hx = a.x * w + Math.sin(t * 0.8 + i * 1.7) * 12;
        const hy = a.y * h + Math.cos(t * 0.65 + i * 2.3) * 12;
        if (!s.ready) { s.x = hx; s.y = hy; s.ready = true; }
        const near = !reduce && inside && Math.hypot(mx - hx, my - hy) < 360;
        let tx = hx, ty = hy;
        if (near) {
          const ang = (i / ARROWS.length) * Math.PI * 2 + t * 0.9;
          const rad = 58 + 12 * Math.sin(t * 2 + i);
          tx = mx + Math.cos(ang) * rad; ty = my + Math.sin(ang) * rad;
        }
        s.vx = (s.vx + (tx - s.x) * 0.07) * 0.8; s.vy = (s.vy + (ty - s.y) * 0.07) * 0.8;
        s.x += s.vx; s.y += s.vy;
        const lx = near ? mx : hx + Math.cos(t * 0.5 + i) * 40, ly = near ? my : hy + Math.sin(t * 0.5 + i) * 40;
        const target = (Math.atan2(ly - s.y, lx - s.x) * 180) / Math.PI + 135;
        s.rot += (((target - s.rot + 540) % 360) - 180) * 0.15;
        const n = nodes.current[i], tip = tips.current[i];
        if (n) n.style.transform = `translate3d(${s.x}px,${s.y}px,0)`;
        if (tip) tip.style.transform = `rotate(${s.rot}deg)`;
      });
      if (!reduce) raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return (
    <div ref={box} className="pointer-events-none absolute inset-0 z-10 hidden md:block" aria-hidden>
      {ARROWS.map((a, i) => (
        <div key={a.name} ref={(r) => { nodes.current[i] = r; }} className="absolute left-0 top-0 will-change-transform">
          <svg ref={(r) => { tips.current[i] = r; }} width="30" height="30" viewBox="0 0 24 24" style={{ transformOrigin: "3px 2px", filter: `drop-shadow(0 4px 6px ${a.color}66)` }}>
            <path d="M3 2l15 7-6.5 2.2L9 18z" fill={a.color} stroke="#fff" strokeWidth="1.4" strokeLinejoin="round" />
          </svg>
          <span className="absolute left-5 top-5 whitespace-nowrap rounded-full px-3 py-1 text-xs font-bold text-white shadow-lg" style={{ background: a.color }}>{a.name}</span>
        </div>
      ))}
    </div>
  );
}
