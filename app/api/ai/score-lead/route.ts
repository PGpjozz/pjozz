import { NextResponse } from "next/server";
import { z } from "zod";

import { fingerprintRawLeadData, reuseCachedLeadScore } from "@/lib/ai/lead-score-throttle";
import { scoreAndAnalyzeLead } from "@/lib/ai/lead-scorer";
import { rawLeadDataSchema } from "@/lib/ai/schemas";
import { createServerSupabaseClient } from "@/lib/db/supabase";
import { getSetting } from "@/lib/settings/store";

import { aiErrorResponse } from "../_utils";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  leadData: rawLeadDataSchema,
  /** When set, responses may reuse the last score without calling Claude if inputs match and TTL has not expired. */
  leadId: z.string().uuid().optional(),
  /** Skip cache and always call Claude. */
  force: z.boolean().optional(),
});

export async function POST(req: Request) {
  try {
    const flags = await getSetting("features.flags");
    if (flags.enableAi === false) {
      return NextResponse.json({ ok: false as const, error: "AI is disabled in settings." }, { status: 503 });
    }

    const json: unknown = await req.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false as const, error: "Invalid request body", issues: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const { leadData, leadId, force } = parsed.data;

    if (leadId && !force) {
      const supabase = createServerSupabaseClient();
      const { data: row, error } = await supabase
        .from("leads")
        .select("enrichment_data")
        .eq("id", leadId)
        .maybeSingle();
      if (!error && row) {
        const cached = reuseCachedLeadScore(row.enrichment_data, leadData);
        if (cached) {
          return NextResponse.json({ ok: true as const, data: cached, cached: true as const });
        }
      }
    }

    const result = await scoreAndAnalyzeLead(leadData);
    const fingerprint = fingerprintRawLeadData(leadData);
    const scoredAt = new Date().toISOString();
    return NextResponse.json({
      ok: true as const,
      data: result,
      cached: false as const,
      ...(leadId ? { scoringMeta: { scoredAt, fingerprint } as const } : {}),
    });
  } catch (e) {
    return aiErrorResponse("score-lead", e);
  }
}
