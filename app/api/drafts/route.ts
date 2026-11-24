import { handle } from "@/lib/api";
import { listDrafts } from "@/lib/db";
export const dynamic = "force-dynamic";
export const GET = handle(async () => listDrafts());
