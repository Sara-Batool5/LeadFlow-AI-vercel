import { NextResponse } from "next/server";
import { handle, fail } from "@/lib/api";
import { createLead, findDuplicates, listLeads } from "@/lib/db";
export const dynamic = "force-dynamic";

export const GET = handle(async (req) => listLeads(new URL(req.url).searchParams.get("q") || ""));

export async function POST(req: Request) {
  try {
    const { lead, allowDuplicate } = await req.json();
    if (!lead?.contact_name?.trim() || !lead?.email?.trim()) return fail(new Error("Contact name and email are required."), 400);
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(lead.email.trim())) return fail(new Error("Please enter a valid email address."), 400);
    if (!allowDuplicate) {
      const matches = await findDuplicates(lead);
      if (matches.length) return NextResponse.json({ duplicate: true, matches }, { status: 409 });
    }
    return NextResponse.json(await createLead(lead));
  } catch (e) { return fail(e); }
}
