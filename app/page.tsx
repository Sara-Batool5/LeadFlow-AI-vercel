import Link from "next/link";
import CursorArrows from "@/components/CursorArrows";
import HeroPreview from "@/components/HeroPreview";
import { CountUp, Reveal } from "@/components/Reveal";
import { Logo } from "@/components/ui";

const STAGES = [
  ["Intake Validation", "Checks required fields and email format."],
  ["Duplicate Detection", "Matches by email, name + company or website."],
  ["Lead Creation", "Saves the lead with a unique reference."],
  ["AI Qualification", "Scores 0–100 and flags missing information."],
  ["Memory Retrieval", "Looks at similar past outcomes for context."],
  ["AI Decision", "Chooses a route: prioritise, ask, review or hold."],
  ["Owner Assignment", "Industry match first, then workload balance."],
  ["Email Draft", "Writes a follow-up and waits for approval."],
];

const FAQ = [
  ["Does LeadFlow AI send emails by itself?", "No. It only drafts follow-ups. Every draft waits in the Human Review Center until a person edits or approves it, and nothing is ever sent automatically."],
  ["Which AI model does it use?", "A Groq-hosted language model. The model name is a single environment variable, so you can switch models without touching the code."],
  ["Where is my lead data stored?", "In your own Neon PostgreSQL database. LeadFlow AI reads and writes it directly; there is no third-party CRM in between."],
  ["Can I import leads from a spreadsheet?", "Yes. Upload a CSV from the dashboard; columns are matched automatically, you get a preview, and leads whose email already exists are skipped."],
  ["How does it decide who gets a lead?", "It first looks for an available owner whose specialisation matches the lead's industry, then falls back to General Business owners, and always balances by current workload and capacity."],
];

export default function Landing() {
  return (
    <main className="overflow-x-clip">
      {/* NAV */}
      <header className="sticky top-0 z-40 border-b border-chalk-3/60 bg-chalk/80 backdrop-blur-xl">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5">
          <Link href="/"><Logo /></Link>
          <div className="hidden gap-8 text-sm font-semibold text-onyx/70 md:flex">
            {[["Features", "#features"], ["Workflow", "#workflow"], ["FAQ", "#faq"]].map(([l, h]) => (
              <a key={l} href={h} className="relative transition hover:text-onyx after:absolute after:-bottom-1 after:left-0 after:h-0.5 after:w-0 after:bg-tangerine after:transition-all hover:after:w-full">{l}</a>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Link href="/login" className="btn btn-sm hidden text-onyx/70 hover:text-onyx sm:inline-flex">Sign in</Link>
            <Link href="/dashboard" className="btn-accent btn-sm">Open Dashboard</Link>
          </div>
        </nav>
      </header>

      {/* HERO */}
      <section className="dotgrid relative px-5 pb-16 pt-20 text-center md:pt-28">
        <CursorArrows />
        <div className="relative z-20 mx-auto max-w-3xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-chalk-3 bg-paper px-4 py-1.5 text-xs font-semibold shadow-soft">
            <span className="rounded-full bg-tangerine px-2 py-0.5 text-[10px] font-extrabold">NEW</span> 8-agent lead pipeline, human approved
          </span>
          <h1 className="mt-6 text-5xl font-extrabold leading-[1.05] tracking-tight md:text-7xl">
            The AI Lead Desk Built to Turn Inquiries Into <span className="text-tangerine">Revenue</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-base text-onyx/65 md:text-lg">
            LeadFlow AI scores every lead, routes it to the right sales owner and drafts the follow-up, while a human approves every email.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/dashboard" className="btn-accent px-7 py-3.5">Open Dashboard →</Link>
            <a href="#workflow" className="btn-ghost px-7 py-3.5">See how it works</a>
          </div>
        </div>
        <HeroPreview />
      </section>

      {/* STATS */}
      <section className="mx-auto max-w-6xl px-5 py-10">
        <div className="grid grid-cols-2 overflow-hidden rounded-3xl border border-chalk-3 bg-paper shadow-soft md:grid-cols-4">
          {[[8, "", "AI agents in the pipeline"], [100, "", "point lead score scale"], [4, "", "routing decisions"], [100, "%", "emails human-approved"]].map(([n, s, l], i) => (
            <Reveal key={i} delay={i * 90} className="border-chalk-3 p-7 text-center md:border-r last:border-r-0">
              <div className="text-5xl font-extrabold tracking-tight"><CountUp to={n as number} suffix={s as string} /></div>
              <div className="mt-2 text-sm text-onyx/60">{l}</div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="mx-auto max-w-6xl scroll-mt-20 px-5 py-20">
        <Reveal>
          <span className="chip bg-tangerine-soft text-tangerine-dark">FEATURES</span>
          <h2 className="mt-4 max-w-md text-4xl font-extrabold tracking-tight md:text-5xl">Smart tools for modern sales teams</h2>
        </Reveal>
        <div className="mt-10 grid gap-5 md:grid-cols-2">
          <Reveal className="card group p-6 transition hover:-translate-y-1 hover:shadow-2xl">
            <div className="rounded-2xl bg-chalk p-5">
              {[["Acme Logistics", 86], ["Bright Dental", 61], ["Nova Retail", 34]].map(([n, v]) => (
                <div key={n as string} className="mb-3 last:mb-0">
                  <div className="mb-1 flex justify-between text-xs font-semibold"><span>{n}</span><span>{v}</span></div>
                  <div className="h-2 rounded-full bg-chalk-3"><div className="h-2 rounded-full bg-tangerine transition-all duration-700 group-hover:brightness-110" style={{ width: `${v}%` }} /></div>
                </div>
              ))}
            </div>
            <h3 className="mt-5 text-xl font-bold">Qualify every lead in seconds</h3>
            <p className="mt-1.5 text-sm text-onyx/60">A 0–100 score, a fit category, the missing information and a recommended next action, using only what the lead actually supplied.</p>
          </Reveal>
          <Reveal delay={100} className="card group p-6 transition hover:-translate-y-1 hover:shadow-2xl">
            <div className="rounded-2xl bg-chalk p-5">
              {[["Healthcare", 4, 10], ["SaaS", 7, 10], ["General Business", 2, 8]].map(([n, a, m]) => (
                <div key={n as string} className="mb-3 flex items-center gap-3 last:mb-0">
                  <span className="w-28 text-xs font-semibold">{n}</span>
                  <div className="flex flex-1 gap-1">{Array.from({ length: m as number }).map((_, i) => <span key={i} className={`h-5 flex-1 rounded-md transition-colors ${i < (a as number) ? "bg-onyx group-hover:bg-tangerine" : "bg-chalk-3"}`} />)}</div>
                </div>
              ))}
            </div>
            <h3 className="mt-5 text-xl font-bold">Route to the right owner</h3>
            <p className="mt-1.5 text-sm text-onyx/60">Industry match first, then a General Business fallback, always respecting each owner's capacity and balancing workload.</p>
          </Reveal>
          <Reveal className="card group p-6 transition hover:-translate-y-1 hover:shadow-2xl">
            <div className="rounded-2xl bg-chalk p-5 text-xs">
              <div className="mb-2 flex items-center justify-between"><b>Subject: Following up on your inquiry</b><span className="chip bg-tangerine-soft text-tangerine-dark">pending review</span></div>
              <div className="space-y-1.5"><div className="h-2 w-full rounded bg-chalk-3" /><div className="h-2 w-11/12 rounded bg-chalk-3" /><div className="h-2 w-8/12 rounded bg-chalk-3" /></div>
              <div className="mt-4 flex gap-2"><span className="btn-dark btn-sm">Approve</span><span className="btn-ghost btn-sm">Edit</span></div>
            </div>
            <h3 className="mt-5 text-xl font-bold">Follow-ups drafted, never auto-sent</h3>
            <p className="mt-1.5 text-sm text-onyx/60">Personalised drafts that never invent facts or promises. You edit, approve or delete each one.</p>
          </Reveal>
          <Reveal delay={100} className="card group p-6 transition hover:-translate-y-1 hover:shadow-2xl">
            <div className="rounded-2xl bg-chalk p-5">
              {["Lead created", "AI qualification completed", "AI decision made", "Owner assigned"].map((e, i) => (
                <div key={e} className="relative flex items-center gap-3 pb-3 last:pb-0">
                  {i < 3 && <span className="absolute left-[5px] top-4 h-full w-px bg-chalk-3" />}
                  <span className="relative h-3 w-3 rounded-full bg-tangerine ring-4 ring-tangerine/20" /><span className="text-xs font-semibold">{e}</span>
                </div>
              ))}
            </div>
            <h3 className="mt-5 text-xl font-bold">Every decision on the record</h3>
            <p className="mt-1.5 text-sm text-onyx/60">A full audit trail of AI decisions, assignments and approvals for every lead.</p>
          </Reveal>
        </div>
      </section>

      {/* WORKFLOW */}
      <section id="workflow" className="mx-auto max-w-6xl scroll-mt-20 px-5 pb-20">
        <div className="card-dark p-8 md:p-12">
          <Reveal>
            <span className="chip bg-tangerine text-onyx">THE PIPELINE</span>
            <h2 className="mt-4 max-w-xl text-4xl font-extrabold tracking-tight md:text-5xl">Eight agents. One lead. Zero busywork.</h2>
          </Reveal>
          <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {STAGES.map(([t, d], i) => (
              <Reveal key={t} delay={i * 60} className="group rounded-2xl border border-white/10 bg-onyx-2 p-5 transition-all duration-300 hover:-translate-y-1 hover:border-tangerine hover:bg-tangerine hover:text-onyx">
                <div className="text-3xl font-extralight text-tangerine group-hover:text-onyx">{String(i + 1).padStart(2, "0")}</div>
                <div className="mt-3 font-bold">{t}</div>
                <div className="mt-1 text-sm text-chalk/60 group-hover:text-onyx/80">{d}</div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="mx-auto max-w-3xl scroll-mt-20 px-5 pb-20">
        <Reveal><h2 className="mb-8 text-center text-4xl font-extrabold tracking-tight">Frequently asked questions</h2></Reveal>
        <div className="space-y-3">
          {FAQ.map(([q, a]) => (
            <details key={q} className="card group p-5 open:border-tangerine/50 [&_summary::-webkit-details-marker]:hidden">
              <summary className="flex cursor-pointer items-center justify-between gap-4 font-bold">{q}<span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-chalk-2 transition group-open:rotate-45 group-open:bg-tangerine">+</span></summary>
              <p className="mt-3 text-sm text-onyx/65">{a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* CTA + FOOTER */}
      <section className="mx-auto max-w-6xl px-5 pb-16">
        <div className="relative overflow-hidden rounded-[32px] bg-tangerine p-10 text-center md:p-16">
          <h2 className="mx-auto max-w-2xl text-4xl font-extrabold tracking-tight md:text-5xl">Ready to see your pipeline run itself?</h2>
          <p className="mx-auto mt-3 max-w-lg text-onyx/75">Import a CSV or add a lead and watch all eight agents work.</p>
          <Link href="/dashboard" className="btn-dark mt-7 px-8 py-3.5">Open Dashboard →</Link>
        </div>
      </section>
      <footer className="border-t border-chalk-3 py-8 text-center text-sm text-onyx/55">
        <div className="flex justify-center"><Logo /></div> <p className="mt-3">© {new Date().getFullYear()} LeadFlow AI · Drafts only, no email is ever sent automatically.</p>
      </footer>
    </main>
  );
}
