"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { Logo } from "./ui";
import CsvImport from "./CsvImport";
import LeadForm from "./LeadForm";
import LeadDrawer from "./LeadDrawer";

type Ctx = { openLead: (id: number) => void; openCreate: () => void; openImport: () => void; version: number; bump: () => void };
const ShellCtx = createContext<Ctx>({ openLead() {}, openCreate() {}, openImport() {}, version: 0, bump() {} });
export const useShell = () => useContext(ShellCtx);

// Sidebar icons live in public/icons/*.png
const NAV = [
  ["/dashboard", "Overview", "/icons/overview.png"],
  ["/dashboard/leads", "Leads", "/icons/leads.png"],
  ["/dashboard/workflow", "Agent Workflow", "/icons/workflow.png"],
  ["/dashboard/review", "Human Review", "/icons/review.png"],
  ["/dashboard/team", "Sales Team", "/icons/team.png"],
  ["/dashboard/activity", "Activity & Audit", "/icons/activity.png"],
  ["/dashboard/setup", "Setup", "/icons/setup.png"],
];

export default function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const [lead, setLead] = useState<number | null>(null);
  const [create, setCreate] = useState(false);
  const [imp, setImp] = useState(false);
  const [version, setVersion] = useState(0);
  const bump = useCallback(() => setVersion((v) => v + 1), []);
  const [me, setMe] = useState<{ name: string; demo: boolean } | null>(null);
  useEffect(() => { fetch("/api/me").then((r) => (r.ok ? r.json() : null)).then(setMe).catch(() => {}); }, []);

  async function signOut(to = "/login") { await fetch("/api/login", { method: "DELETE" }); window.location.href = to; }

  return (
    <ShellCtx.Provider value={{ openLead: setLead, openCreate: () => setCreate(true), openImport: () => setImp(true), version, bump }}>
      <div className="min-h-screen p-3 lg:flex lg:gap-4 lg:p-4">
        <aside className="card mb-3 flex shrink-0 flex-col gap-1 p-3 lg:sticky lg:top-4 lg:mb-0 lg:h-[calc(100vh-2rem)] lg:w-64 lg:p-4">
          <div className="flex items-center justify-between px-2 py-1 lg:mb-4"><Link href="/"><Logo /></Link></div>
          <nav className="flex gap-1.5 overflow-x-auto lg:flex-1 lg:flex-col lg:overflow-visible">
            {NAV.map(([href, label, d]) => {
              const active = href === "/dashboard" ? path === href : path.startsWith(href);
              return (
                <Link key={href} href={href} className={`group flex shrink-0 items-center gap-3 rounded-2xl px-3.5 py-2.5 text-sm font-semibold transition-all duration-200 ${active ? "bg-onyx text-chalk shadow-soft" : "text-onyx/65 hover:bg-chalk-2 hover:text-onyx lg:hover:translate-x-1"}`}>
                  <img src={d} alt="" className={`h-5 w-5 shrink-0 object-contain transition duration-200 group-hover:scale-125 ${active ? "" : "opacity-90"}`} draggable={false} />{label}
                </Link>
              );
            })}
          </nav>
          <div className="mt-2 hidden space-y-2 border-t border-chalk-2 pt-4 lg:block">
            <button onClick={() => setImp(true)} className="btn-accent w-full">⬆ Import CSV</button>
            {me && <div className="flex items-center gap-2.5 rounded-2xl bg-chalk-2 px-3 py-2"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-onyx text-xs font-bold text-chalk">{me.name.split(" ").map((x) => x[0]).slice(0, 2).join("").toUpperCase()}</span><div className="min-w-0"><div className="truncate text-sm font-semibold">{me.name}</div><div className="text-[11px] text-onyx/50">{me.demo ? "Demo workspace" : "Signed in"}</div></div></div>}
            <button onClick={() => signOut()} className="btn-ghost w-full">Sign out</button>
          </div>
        </aside>
        <main className="min-w-0 flex-1 animate-fadeUp lg:px-2 lg:py-4">
          {me?.demo && (
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-tangerine/40 bg-tangerine-soft px-4 py-3 text-sm">
              <span><b>You&apos;re in the demo workspace.</b> Sample data is shared and resets every few hours. AI actions are limited.</span>
              <button className="btn-dark btn-sm" onClick={() => signOut("/login?mode=signup")}>Create your own account</button>
            </div>
          )}
          {children}
        </main>
      </div>
      <CsvImport open={imp} onClose={() => setImp(false)} onDone={bump} />
      <LeadForm open={create} onClose={() => setCreate(false)} onDone={bump} onOpenLead={setLead} />
      <LeadDrawer id={lead} onClose={() => setLead(null)} onChange={bump} />
    </ShellCtx.Provider>
  );
}
