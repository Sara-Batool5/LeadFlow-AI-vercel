"use client";
import { Alert, PageHeader, Spinner } from "@/components/ui";
import { useApi } from "@/lib/client";

export default function Setup() {
  const { data, error, loading, reload } = useApi<any>("/api/health");
  const Row = ({ ok, label, hint }: { ok: boolean; label: string; hint: string }) => (
    <div className="flex items-start gap-3 rounded-2xl bg-white p-4">
      <span className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-bold text-white ${ok ? "bg-emerald-500" : "bg-rose-500"}`}>{ok ? "✓" : "!"}</span>
      <div><div className="font-semibold">{label}</div><div className="break-words text-xs text-onyx/55">{hint}</div></div>
    </div>
  );
  return (
    <>
      <PageHeader title="Setup" subtitle="Connection checks for your Neon database and Groq key.">
        <button className="btn-dark" onClick={reload}>Re-check</button>
      </PageHeader>
      {loading ? <div className="grid place-items-center py-20"><Spinner className="h-6 w-6" /></div> : (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-3">
            {error && <Alert>{error}</Alert>}
            <Row ok={!!data?.ok} label="Neon database" hint={data?.ok ? String(data.message).slice(0, 90) : data?.message || "Not connected. Set NEON_DATABASE_URL in Vercel."} />
            <Row ok={!!data?.groq} label="Groq API key" hint={data?.groq ? `Configured · model ${data.model}` : "Set GROQ_API_KEY in Vercel."} />
          </div>
          <div className="card p-5">
            <h2 className="mb-3 font-bold">Table row counts</h2>
            {data?.counts ? <dl className="space-y-2 text-sm">{Object.entries(data.counts).map(([k, v]) => <div key={k} className="flex justify-between rounded-xl bg-white px-4 py-2.5"><dt className="font-mono text-xs">{k}</dt><dd className="font-bold">{v as number}</dd></div>)}</dl> : <p className="text-sm text-onyx/50">Counts appear once the database connects and the LeadFlow tables exist.</p>}
            <p className="mt-4 text-xs text-onyx/50">This app reads the tables your Streamlit version already created. It never creates or alters tables.</p>
          </div>
        </div>
      )}
    </>
  );
}
