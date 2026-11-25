import { NextResponse } from "next/server";
import { handle, fail, withWs } from "@/lib/api";
import { createLead, findDuplicates, listLeads } from "@/lib/db";
export const dynamic = "force-dynamic";

export const GET = handle(async (req) => listLeads(new URL(req.url).searchParams.get("q") || ""));

export async function POST(req: Request) {
  try {
    const { lead, allowDuplicate } = await req.json();
    const out = await withWs(req, async () => {
      if (!lead?.contact_name?.trim() || !lead?.email?.trim()) throw Object.assign(new Error("Contact name and email are required."), { status: 400 });
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(lead.email.trim())) throw Object.assign(new Error("Please enter a valid email address."), { status: 400 });
      if (!allowDuplicate) {
        const matches = await findDuplicates(lead);
        if (matches.length) return { status: 409, body: { duplicate: true, matches } };
      }
      return { status: 200, body: await createLead(lead) };
    });
    return NextResponse.json(out.body, { status: out.status });
  } catch (e) { return fail(e); }
}
