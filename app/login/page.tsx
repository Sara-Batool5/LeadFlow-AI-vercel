"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Alert, Logo, Spinner } from "@/components/ui";

export default function Login() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [f, setF] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [me, setMe] = useState<{ signedIn: boolean; name?: string; demo?: boolean } | null>(null);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("mode") === "signup") setMode("signup");
    fetch("/api/login").then((r) => r.json()).then(setMe).catch(() => setMe({ signedIn: false }));
  }, []);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  async function send(action: string) {
    setBusy(action); setError("");
    const res = await fetch("/api/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, ...f }) });
    if (res.ok) { window.location.href = "/dashboard"; return; }
    setError((await res.json().catch(() => ({}))).error || "Something went wrong. Please try again."); setBusy("");
  }
  async function signOut() { await fetch("/api/login", { method: "DELETE" }); setMe({ signedIn: false }); }

  return (
    <main className="dotgrid grid min-h-screen place-items-center p-5">
      {me?.signedIn ? (
        <div className="card w-full max-w-sm animate-fadeUp p-8">
          <Link href="/"><Logo /></Link>
          <h1 className="mt-6 text-2xl font-extrabold">You&apos;re signed in{me.demo ? " to the demo" : `, ${me.name}`}</h1>
          <p className="mt-1 text-sm text-onyx/60">This browser already has an active session.</p>
          <Link href="/dashboard" className="btn-accent mt-6 w-full">Continue to dashboard</Link>
          <button onClick={signOut} className="btn-ghost mt-3 w-full">Sign out</button>
        </div>
      ) : (
        <div className="card w-full max-w-md animate-fadeUp p-8">
          <Link href="/"><Logo /></Link>
          <div className="mt-6 flex gap-1 rounded-full bg-chalk-2 p-1">
            {([["signin", "Sign in"], ["signup", "Create account"]] as const).map(([k, l]) => (
              <button key={k} onClick={() => { setMode(k); setError(""); }} className={`flex-1 rounded-full py-2 text-sm font-bold transition ${mode === k ? "bg-onyx text-chalk" : "text-onyx/60 hover:text-onyx"}`}>{l}</button>
            ))}
          </div>
          <h1 className="mt-6 text-2xl font-extrabold">{mode === "signin" ? "Welcome back" : "Create your workspace"}</h1>
          <p className="mt-1 text-sm text-onyx/60">{mode === "signin" ? "Sign in to your LeadFlow AI workspace." : "Your leads stay private to your account."}</p>

          <form className="mt-5 space-y-4" onSubmit={(e) => { e.preventDefault(); send(mode); }}>
            {mode === "signup" && <div><label className="label">Your name</label><input className="input" autoComplete="name" value={f.name} onChange={set("name")} /></div>}
            <div><label className="label">Email</label><input className="input" type="email" autoComplete="email" value={f.email} onChange={set("email")} /></div>
            <div><label className="label">Password</label><input className="input" type="password" autoComplete={mode === "signin" ? "current-password" : "new-password"} placeholder={mode === "signup" ? "At least 8 characters" : ""} value={f.password} onChange={set("password")} /></div>
            {error && <Alert>{error}</Alert>}
            <button className="btn-accent w-full" disabled={!!busy || !f.email || !f.password}>{busy === mode ? <Spinner /> : mode === "signin" ? "Sign in" : "Create account"}</button>
          </form>

          <div className="my-5 flex items-center gap-3 text-xs text-onyx/40"><span className="h-px flex-1 bg-chalk-3" />or<span className="h-px flex-1 bg-chalk-3" /></div>
          <button className="btn-ghost w-full" disabled={!!busy} onClick={() => send("demo")}>{busy === "demo" ? <><Spinner /> Preparing demo…</> : "▶ Try the demo (no sign-up)"}</button>
          <p className="mt-3 text-center text-[11px] text-onyx/45">The demo is a shared sandbox with sample data that resets every few hours.</p>
        </div>
      )}
    </main>
  );
}
