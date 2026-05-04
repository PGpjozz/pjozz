import { NextResponse } from "next/server";
import { z } from "zod";

import type { TablesInsert } from "@/lib/db/database.types";
import { createServerSupabaseClient, getLeadById } from "@/lib/db/supabase";
import { proposalContentOutputSchema } from "@/lib/ai/schemas";
import type { ProposalContent } from "@/lib/ai/types";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  content: proposalContentOutputSchema,
});

function proposalToRow(leadId: string, c: ProposalContent): TablesInsert<"proposals"> {
  const scope = [
    c.executiveSummary,
    c.problemStatement,
    c.proposedSolution,
    c.whyPjozz,
    c.nextSteps,
  ].join("\n\n");
  const timelineText = c.timeline.map((t) => `${t.phase} (${t.duration}): ${t.description}`).join("\n");
  const prices = c.investmentOptions.map((o) => o.price);
  const total = prices.length ? Math.max(...prices) : null;
  return {
    lead_id: leadId,
    title: c.title,
    scope,
    deliverables: c.deliverables as unknown as TablesInsert<"proposals">["deliverables"],
    timeline: timelineText,
    pricing: {
      investmentOptions: c.investmentOptions,
      executiveSummary: c.executiveSummary,
    } as unknown as TablesInsert<"proposals">["pricing"],
    total_value: total,
    currency: "ZAR",
    status: "draft",
    generated_by_ai: true,
    document_json: c as unknown as TablesInsert<"proposals">["document_json"],
    discovery_json: {},
  };
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const lead = await getLeadById(id);
    if (!lead) {
      return NextResponse.json({ ok: false as const, error: "Not found" }, { status: 404 });
    }
    const json: unknown = await req.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false as const, error: "Invalid body", issues: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const supabase = createServerSupabaseClient();
    const row = proposalToRow(id, parsed.data.content);
    const { data, error } = await supabase.from("proposals").insert(row).select("*").single();
    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true as const, data });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server error";
    const status = msg.includes("is not set") ? 503 : 500;
    return NextResponse.json({ ok: false as const, error: msg }, { status });
  }
}
