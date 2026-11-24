import type { Stage } from "@/lib/workflow";

// Visual pipeline result: one row per agent stage.
export default function StageList({ stages }: { stages: Stage[] }) {
  const tone: Record<string, string> = { done: "bg-emerald-500 text-white", failed: "bg-rose-500 text-white", skipped: "bg-chalk-3 text-onyx/60", waiting: "bg-chalk-2 text-onyx/40" };
  const icon: Record<string, string> = { done: "✓", failed: "!", skipped: "–", waiting: "·" };
  return (
    <ol className="space-y-2">
      {stages.map((s, i) => (
        <li key={s.key} className="flex animate-fadeUp gap-3 rounded-2xl bg-white p-3.5" style={{ animationDelay: `${i * 70}ms` }}>
          <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-extrabold ${tone[s.status]}`}>{icon[s.status]}</span>
          <div className="min-w-0">
            <div className="text-sm font-bold">{i + 1}. {s.label}</div>
            {s.detail && <div className="mt-0.5 break-words text-xs text-onyx/60">{s.detail}</div>}
          </div>
        </li>
      ))}
    </ol>
  );
}
