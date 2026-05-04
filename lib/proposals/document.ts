import { randomBytes } from "crypto";

import type { Json, Tables, TablesUpdate } from "@/lib/db/database.types";
import { proposalContentOutputSchema } from "@/lib/ai/schemas";
import type { ProposalContent } from "@/lib/ai/types";

export function rowToProposalDocument(row: Tables<"proposals">): ProposalContent | null {
  const dj = row.document_json;
  if (dj && typeof dj === "object" && !Array.isArray(dj) && "executiveSummary" in dj) {
    const p = proposalContentOutputSchema.safeParse(dj);
    if (p.success) return p.data;
  }
  return null;
}

export function proposalContentToRowPatch(content: ProposalContent): TablesUpdate<"proposals"> {
  const scope = [
    content.executiveSummary,
    content.problemStatement,
    content.proposedSolution,
    content.whyPjozz,
    content.nextSteps,
  ].join("\n\n");
  const timelineText = content.timeline.map((t) => `${t.phase} (${t.duration}): ${t.description}`).join("\n");
  const prices = content.investmentOptions.map((o) => o.price);
  const total = prices.length ? Math.max(...prices) : null;
  return {
    title: content.title,
    scope,
    deliverables: content.deliverables as unknown as Json,
    timeline: timelineText,
    pricing: {
      investmentOptions: content.investmentOptions,
      executiveSummary: content.executiveSummary,
    } as unknown as Json,
    total_value: total,
    document_json: content as unknown as Json,
  };
}

export function generateShareToken(): string {
  return randomBytes(24).toString("base64url");
}
