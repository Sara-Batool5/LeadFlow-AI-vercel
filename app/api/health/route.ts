import { handle } from "@/lib/api";
import { health, tableCounts } from "@/lib/db";
export const dynamic = "force-dynamic";
export const GET = handle(async () => {
  const h = await health();
  const counts = h.ok ? await tableCounts().catch(() => null) : null;
  return { ...h, counts, groq: !!process.env.GROQ_API_KEY, model: process.env.GROQ_MODEL || "openai/gpt-oss-120b" };
});
