import { handle } from "@/lib/api";
import { createOwner, listOwners, setOwnerAvailability } from "@/lib/db";
export const dynamic = "force-dynamic";

export const GET = handle(async () => listOwners());
export const POST = handle(async (req) => {
  const o = await req.json();
  if (!o.full_name?.trim() || !o.email?.trim()) throw new Error("Name and email are required.");
  return createOwner(o);
});
export const PATCH = handle(async (req) => {
  const { id, is_available } = await req.json();
  await setOwnerAvailability(Number(id), is_available);
  return { ok: true };
});
