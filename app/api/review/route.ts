import { handle } from "@/lib/api";
import { reviewQueue } from "@/lib/db";
export const dynamic = "force-dynamic";
export const GET = handle(async () => reviewQueue());
