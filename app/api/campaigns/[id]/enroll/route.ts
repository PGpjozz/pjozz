import { NextResponse } from "next/server";
import { z } from "zod";

import { createServerSupabaseClient } from "@/lib/db/supabase";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  leadIds: z.array(z.string().uuid()).min(1).max(500),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: campaignId } = await params;
    const json: unknown = await req.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false as const, error: "Invalid body", issues: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();
    const { data: camp, error: cErr } = await supabase.from("campaigns").select("id").eq("id", campaignId).maybeSingle();
    if (cErr) throw new Error(cErr.message);
    if (!camp) return NextResponse.json({ ok: false as const, error: "Campaign not found" }, { status: 404 });

    const rows = parsed.data.leadIds.map((leadId) => ({
      campaign_id: campaignId,
      lead_id: leadId,
      current_step_index: 0,
      status: "active" as const,
      next_send_after: null as string | null,
    }));

    const { error: insErr } = await supabase.from("campaign_enrollments").upsert(rows, {
      onConflict: "campaign_id,lead_id",
      ignoreDuplicates: true,
    });
    if (insErr) throw new Error(insErr.message);

    const { count, error: cntErr } = await supabase
      .from("campaign_enrollments")
      .select("*", { count: "exact", head: true })
      .eq("campaign_id", campaignId);
    if (cntErr) throw new Error(cntErr.message);

    await supabase.from("campaigns").update({ leads_count: count ?? 0 }).eq("id", campaignId);

    return NextResponse.json({ ok: true as const, data: { enrolled: parsed.data.leadIds.length, leadsCount: count ?? 0 } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server error";
    const status = msg.includes("is not set") ? 503 : 500;
    return NextResponse.json({ ok: false as const, error: msg }, { status });
  }
}
