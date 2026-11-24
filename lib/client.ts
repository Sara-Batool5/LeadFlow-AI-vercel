"use client";
import { useCallback, useEffect, useState } from "react";

export async function api<T = any>(path: string, init?: { method?: string; body?: any }): Promise<T> {
  const res = await fetch(path, {
    method: init?.method || "GET",
    headers: init?.body ? { "Content-Type": "application/json" } : undefined,
    body: init?.body ? JSON.stringify(init.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && typeof window !== "undefined") window.location.href = "/login";
  if (!res.ok) { const e: any = new Error(data?.error || `Request failed (${res.status})`); e.status = res.status; e.data = data; throw e; }
  return data;
}

export function useApi<T = any>(path: string) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true);
    try { setData(await api<T>(path)); setError(""); } catch (e: any) { setError(e.message); }
    setLoading(false);
  }, [path]);
  useEffect(() => { load(); }, [load]);
  return { data, error, loading, reload: load };
}

export const fmtDate = (d: any) => (d ? new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—");
export const fmtDateTime = (d: any) => (d ? new Date(d).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—");
export const initials = (n: string) => (n || "?").split(/\s+/).map((x) => x[0]).slice(0, 2).join("").toUpperCase();
