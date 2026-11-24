"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Alert, Logo, Spinner } from "@/components/ui";

export default function Login() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);

  useEffect(() => { fetch("/api/login").then((r) => r.json()).then((d) => setSignedIn(!!d.signedIn)).catch(() => setSignedIn(false)); }, []);
  async function signOut() { await fetch("/api/login", { method: "DELETE" }); setSignedIn(false); }

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError("");
    const res = await fetch("/api/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) });
    if (res.ok) { window.location.href = "/dashboard"; return; }
    setError((await res.json().catch(() => ({}))).error || "Could not sign in."); setBusy(false);
  }

  return (
    <main className="dotgrid grid min-h-screen place-items-center p-5">
      {signedIn ? (
        <div className="card w-full max-w-sm animate-fadeUp p-8">
          <Link href="/"><Logo /></Link>
          <h1 className="mt-6 text-2xl font-extrabold">You&apos;re already signed in</h1>
          <p className="mt-1 text-sm text-onyx/60">This browser has an active session, so the dashboard opens without asking for the password again. Sessions last 8 hours.</p>
          <Link href="/dashboard" className="btn-accent mt-6 w-full">Continue to dashboard</Link>
          <button onClick={signOut} className="btn-ghost mt-3 w-full">Sign out</button>
        </div>
      ) : (
      <form onSubmit={submit} className="card w-full max-w-sm animate-fadeUp p-8">
        <Link href="/"><Logo /></Link>
        <h1 className="mt-6 text-2xl font-extrabold">Welcome back</h1>
        <p className="mt-1 text-sm text-onyx/60">Enter the access password to open the dashboard.</p>
        <label className="label mt-6">Password</label>
        <input className="input" type="password" autoFocus value={password} onChange={(e) => setPassword(e.target.value)} />
        {error && <div className="mt-4"><Alert>{error}</Alert></div>}
        <button className="btn-accent mt-6 w-full" disabled={busy || !password}>{busy ? <Spinner /> : "Sign in"}</button>
      </form>
      )}
    </main>
  );
}
