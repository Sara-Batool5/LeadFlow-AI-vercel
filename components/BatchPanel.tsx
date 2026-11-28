"use client";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/client";
import { Spinner } from "./ui";

export type BatchItem = { id: number; name: string; company?: string };
type Row = BatchItem & { state: "waiting" | "running" | "done" | "failed"; text?: string };

const ROUTE: Record<string, string> = {
  prioritize_sales: "Sent to sales", request_information: "Needs more info", human_review: "Needs human review", hold_low_fit: "Held (low fit)",
};

// Runs the full AI workflow for many leads, two at a time, and shows live progress.
export default function BatchPanel({ items, requalify = false, onFinished }: { items: BatchItem[]; requalify?: boolean; onFinished?: () => void }) {
  const [rows, setRows] = useState<Row[]>(items.map((i) => ({ ...i, state: "waiting" })));
  const [finished, setFinished] = useState(false);
  const cancel = useRef(false);
  const started = useRef(false);

  const patch = (i: number, p: Partial<Row>) => setRows((rs) => rs.map((r, k) => (k === i ? { ...r, ...p } : r)));

  useEffect(() => {
    cancel.current = false;
    if (!started.current) {
      started.current = true;
      let next = 0;
      const worker = async () => {
        while (!cancel.current) {
          const i = next++;
          if (i >= items.length) return;
          patch(i, { state: "running" });
          try {
            const r = await api("/api/workflow", { method: "POST", body: { leadId: items[i].id, requalify } });
            const owner = r.stages?.find((s: any) => s.key === "owner_assignment");
            if (r.error) patch(i, { state: "failed", text: r.error });
            else patch(i, { state: "done", text: `${ROUTE[r.route] || r.route}${owner?.status === "done" ? ` · ${owner.detail.replace(/^Assigned (automatically )?to /, "Owner: ").replace(/ \(.*$/, "")}` : owner?.status === "failed" ? " · no owner available" : ""}`, route: r.route } as any);
          } catch (e: any) {
            patch(i, { state: "failed", text: e.message });
            if (e.status === 429) cancel.current = true; // daily AI limit reached: stop the batch
          }
        }
      };
      Promise.all([worker(), worker()]).then(() => { setFinished(true); onFinished?.(); });
    }
    return () => { cancel.current = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const done = rows.filter((r) => r.state === "done" || r.state === "failed").length;
  const tally = rows.reduce((a: Record<string, number>, r: any) => { if (r.state === "done") a[r.route] = (a[r.route] || 0) + 1; if (r.state === "failed") a.failed = (a.failed || 0) + 1; return a; }, {});

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm">
        <b>{finished ? (cancel.current && done < rows.length ? "Stopped" : "Finished") : "AI agents are working…"}</b>
        <span className="text-onyx/55">{done} / {rows.length}</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-chalk-3"><div className="h-2.5 rounded-full bg-tangerine transition-all duration-500" style={{ width: `${(done / Math.max(rows.length, 1)) * 100}%` }} /></div>
      <div className="flex flex-wrap gap-1.5 text-[11px] font-semibold">
        {Object.entries(tally).map(([k, v]) => <span key={k} className={`chip ${k === "failed" ? "bg-rose-100 text-rose-800" : "bg-chalk-2"}`}>{k === "failed" ? "Failed" : ROUTE[k] || k}: {v}</span>)}
      </div>
      <ul className="max-h-64 space-y-1.5 overflow-auto rounded-2xl bg-white p-2.5">
        {rows.map((r) => (
          <li key={r.id} className="flex items-center gap-3 rounded-xl px-2.5 py-1.5 text-sm">
            <span className="grid h-5 w-5 shrink-0 place-items-center">
              {r.state === "running" ? <Spinner className="h-4 w-4 text-tangerine" /> : r.state === "done" ? <span className="text-emerald-600">✓</span> : r.state === "failed" ? <span className="text-rose-600">!</span> : <span className="text-onyx/25">·</span>}
            </span>
            <span className="min-w-0 flex-1 truncate font-semibold">{r.name}{r.company ? <span className="font-normal text-onyx/45"> · {r.company}</span> : null}</span>
            <span className={`max-w-[55%] truncate text-xs ${r.state === "failed" ? "text-rose-700" : "text-onyx/55"}`} title={r.text}>{r.text || (r.state === "running" ? "Qualifying…" : "Waiting")}</span>
          </li>
        ))}
      </ul>
      {!finished && <button className="btn-ghost btn-sm" onClick={() => { cancel.current = true; }}>Stop after current leads</button>}
    </div>
  );
}
