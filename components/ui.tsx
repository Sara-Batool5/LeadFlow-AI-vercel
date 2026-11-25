"use client";
import { useEffect } from "react";

// The LeadFlow AI logo (public/logo.png = full logo, public/logo-mark.png = icon only).
export function Logo({ mark = false, className = "" }: { dark?: boolean; mark?: boolean; className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={mark ? "/logo-mark.png" : "/logo.png"} alt="LeadFlow AI" className={`w-auto select-none ${mark ? "h-9" : "h-10"} ${className}`} draggable={false} />;
}

const TONES: Record<string, string> = {
  new: "bg-chalk-2 text-onyx", contacted: "bg-tangerine-soft text-tangerine-dark", qualified: "bg-onyx text-chalk",
  "in progress": "bg-tangerine text-onyx", closed: "bg-chalk-3 text-onyx", won: "bg-emerald-100 text-emerald-800",
  lost: "bg-rose-100 text-rose-800", disqualified: "bg-rose-100 text-rose-800",
  closed_won: "bg-emerald-100 text-emerald-800", closed_lost: "bg-rose-100 text-rose-800", qualifying: "bg-tangerine-soft text-tangerine-dark", needs_review: "bg-tangerine-soft text-tangerine-dark", assigned: "bg-chalk-3 text-onyx",
  high: "bg-onyx text-chalk", urgent: "bg-tangerine text-onyx", medium: "bg-tangerine-soft text-tangerine-dark", low: "bg-chalk-2 text-onyx", unassessed: "bg-chalk-2 text-onyx/60",
  pending_review: "bg-tangerine-soft text-tangerine-dark", approved: "bg-emerald-100 text-emerald-800",
  completed: "bg-emerald-100 text-emerald-800", failed: "bg-rose-100 text-rose-800",
};
export function Badge({ value }: { value?: string | null }) {
  const v = (value || "new").toLowerCase();
  return (
    <span className={`chip ${TONES[v] || "bg-chalk-2 text-onyx"}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />{v.replace(/_/g, " ")}
    </span>
  );
}

export function Spinner({ className = "" }: { className?: string }) {
  return <span className={`inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent ${className}`} />;
}

export function Modal({ open, onClose, title, children, wide = false }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4">
      <div className="absolute inset-0 bg-onyx/50 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative max-h-[90vh] w-full overflow-auto rounded-3xl bg-paper p-6 shadow-2xl animate-pop ${wide ? "max-w-3xl" : "max-w-xl"}`}>
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-xl font-extrabold">{title}</h2>
          <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full bg-chalk-2 transition hover:bg-onyx hover:text-chalk" aria-label="Close">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Alert({ kind = "error", children }: { kind?: "error" | "ok" | "info"; children: React.ReactNode }) {
  const c = kind === "error" ? "bg-rose-50 text-rose-800 border-rose-200" : kind === "ok" ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-tangerine-soft text-onyx border-tangerine/40";
  return <div className={`rounded-2xl border px-4 py-3 text-sm ${c}`}>{children}</div>;
}

export function PageHeader({ title, subtitle, children }: { title: string; subtitle?: string; children?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-4xl font-light tracking-tight md:text-5xl">{title}</h1>
        {subtitle && <p className="mt-1.5 text-sm text-onyx/60">{subtitle}</p>}
      </div>
      <div className="flex flex-wrap items-center gap-2.5">{children}</div>
    </div>
  );
}
