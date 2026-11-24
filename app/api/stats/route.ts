import { handle } from "@/lib/api";
import { stats } from "@/lib/db";
export const dynamic = "force-dynamic";
export const GET = handle(async () => stats());
