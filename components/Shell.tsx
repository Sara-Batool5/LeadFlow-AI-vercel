"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useCallback, useContext, useState } from "react";
import { Logo } from "./ui";
import CsvImport from "./CsvImport";
import LeadForm from "./LeadForm";
import LeadDrawer from "./LeadDrawer";

type Ctx = { openLead: (id: number) => void; openCreate: () => void; openImport: () => void; version: number; bump: () => void };
const ShellCtx = createContext<Ctx>({ openLead() {}, openCreate() {}, openImport() {}, version: 0, bump() {} });
export const useShell = () => useContext(ShellCtx);

const I = (d: string) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>;
const NAV = [
  ["/dashboard", "Overview", "M3 12l9-9 9 9M5 10v10h14V10"],
  ["/dashboard/leads", "Leads", "M17 21v-2a4 4 0 00-4-4H7a4 4 0 00-4 4v2M10 11a4 4 0 100-8 4 4 0 000 8zM21 21v-2a4 4 0 00-3-3.9"],
  ["/dashboard/workflow", "Agent Workflow", "M13 2L3 14h8l-1 8 10-12h-8z"],
  ["/dashboard/review", "Human Review", "M9 12l2 2 4-4M21 12a9 9 0 11-18 0 9 9 0 0118 0z"],
  ["/dashboard/team", "Sales Team", "M3 21h18M5 21V7l7-4 7 4v14M9 9h1M14 9h1M9 13h1M14 13h1"],
  ["/dashboard/activity", "Activity & Audit", "M3 3v18h18M7 14l4-4 3 3 5-6"],
  ["/dashboard/setup", "Setup", "M12 15a3 3 0 100-6 3 3 0 000 6zM19 12a7 7 0 00-.1-1.2l2-1.5-2-3.4-2.3 1a7 7 0 00-2-1.2L14 3h-4l-.6 2.7a7 7 0 00-2 1.2l-2.3-1-2 3.4 2 1.5A7 7 0 005 12c0 .4 0 .8.1 1.2l-2 1.5 2 3.4 2.3-1a7 7 0 002 1.2L10 21h4l.6-2.7a7 7 0 002-1.2l2.3 1 2-3.4-2-1.5c.1-.4.1-.8.1-1.2z"],
];

export default function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const [lead, setLead] = useState<number | null>(null);
  const [create, setCreate] = useState(false);
  const [imp, setImp] = useState(false);
  const [version, setVersion] = useState(0);
  const bump = useCallback(() => setVersion((v) => v + 1), []);

  async function signOut() { await fetch("/api/login", { method: "DELETE" }); window.location.href = "/login"; }

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
                  <span className={active ? "text-tangerine" : "transition group-hover:text-tangerine"}>{I(d)}</span>{label}
                </Link>
              );
            })}
          </nav>
          <div className="mt-2 hidden space-y-2 border-t border-chalk-2 pt-4 lg:block">
            <button onClick={() => setImp(true)} className="btn-accent w-full">⬆ Import CSV</button>
            <button onClick={signOut} className="btn-ghost w-full">Sign out</button>
          </div>
        </aside>
        <main className="min-w-0 flex-1 animate-fadeUp lg:px-2 lg:py-4">{children}</main>
      </div>
      <CsvImport open={imp} onClose={() => setImp(false)} onDone={bump} />
      <LeadForm open={create} onClose={() => setCreate(false)} onDone={bump} onOpenLead={setLead} />
      <LeadDrawer id={lead} onClose={() => setLead(null)} onChange={bump} />
    </ShellCtx.Provider>
  );
}
