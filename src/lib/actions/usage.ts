"use server";

import { getCurrentUser } from "@/lib/auth";
import { isUsageTool, recordUsage } from "@/lib/usage";

/** Enregistre une opération de la démo pour les personnes connectées (sinon, ne fait rien). */
export async function recordUsageAction(tool: string, pages: number) {
  const user = await getCurrentUser();
  if (!user || !isUsageTool(tool)) return { recorded: false };
  await recordUsage(user.id, tool, Number.isFinite(pages) ? pages : 0);
  return { recorded: true };
}
