import { randomUUID } from "node:crypto";
import { and, gte, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { usageEvents, USAGE_TOOLS, type UsageTool } from "@/lib/db/schema";

export const TOOL_LABELS: Record<UsageTool, string> = {
  edit: "Édition",
  organize: "Organisation",
  merge: "Fusion / division",
  convert: "Conversion",
  compress: "Compression",
  ocr: "OCR",
  sign: "Signature",
  protect: "Protection",
  redact: "Caviardage",
  forms: "Formulaires",
  annotate: "Annotation",
  compare: "Comparaison",
};

export function isUsageTool(value: unknown): value is UsageTool {
  return typeof value === "string" && (USAGE_TOOLS as readonly string[]).includes(value);
}

export async function recordUsage(userId: string, tool: UsageTool, pages = 0) {
  await db.insert(usageEvents).values({ id: randomUUID(), userId, tool, pages: Math.max(0, Math.round(pages)) });
}

export type UsageSummary = {
  thisMonth: { documents: number; pages: number; signatures: number; ocrPages: number };
  monthly: { label: string; documents: number; pages: number }[];
  byTool: { tool: UsageTool; label: string; documents: number }[];
  total: number;
};

const MONTHS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];

/** Statistiques d'usage sur six mois pour un ou plusieurs comptes (établissement = propriétaire + collaborateur·trice·s). */
export async function getUsageSummary(userIds: string[]): Promise<UsageSummary> {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const rows =
    userIds.length === 0
      ? []
      : await db
          .select({ tool: usageEvents.tool, pages: usageEvents.pages, createdAt: usageEvents.createdAt })
          .from(usageEvents)
          .where(and(inArray(usageEvents.userId, userIds), gte(usageEvents.createdAt, start)));

  const monthly = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
    return { key: `${d.getFullYear()}-${d.getMonth()}`, label: MONTHS[d.getMonth()], documents: 0, pages: 0 };
  });
  const byTool = new Map<UsageTool, number>();
  const thisMonth = { documents: 0, pages: 0, signatures: 0, ocrPages: 0 };
  const monthKey = `${now.getFullYear()}-${now.getMonth()}`;

  for (const r of rows) {
    const key = `${r.createdAt.getFullYear()}-${r.createdAt.getMonth()}`;
    const m = monthly.find((x) => x.key === key);
    if (m) {
      m.documents += 1;
      m.pages += r.pages;
    }
    byTool.set(r.tool, (byTool.get(r.tool) ?? 0) + 1);
    if (key === monthKey) {
      thisMonth.documents += 1;
      thisMonth.pages += r.pages;
      if (r.tool === "sign") thisMonth.signatures += 1;
      if (r.tool === "ocr") thisMonth.ocrPages += r.pages;
    }
  }

  return {
    thisMonth,
    monthly: monthly.map(({ label, documents, pages }) => ({ label, documents, pages })),
    byTool: [...byTool.entries()]
      .map(([tool, documents]) => ({ tool, label: TOOL_LABELS[tool], documents }))
      .sort((a, b) => b.documents - a.documents),
    total: rows.length,
  };
}
