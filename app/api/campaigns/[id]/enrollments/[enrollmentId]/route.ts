import { NextResponse } from "next/server";
import { z } from "zod";

import { createServerSupabaseClient } from "@/lib/db/supabase";
import { addDaysIso } from "@/lib/campaigns/send-window";
import { parseSequence } from "@/lib/campaigns/parse";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  action: z.enum(["pause", "resume", "skip", "remove"]),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; enrollmentId: string }> }
) {
  try {
    const { id: campaignId, enrollmentId } = await params;
    const json: unknown = await req.json();
    const parsed = patchSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false as const, error: "Invalid body", issues: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();
    const { data: row, error: gErr } = await supabase
      .from("campaign_enrollments")
      .select("*")
      .eq("id", enrollmentId)
      .eq("campaign_id", campaignId)
      .maybeSingle();
    if (gErr) throw new Error(gErr.message);
    if (!row) return NextResponse.json({ ok: false as const, error: "Enrollment not found" }, { status: 404 });

    const action = parsed.data.action;

    if (action === "remove") {
      const { error: dErr } = await supabase.from("campaign_enrollments").delete().eq("id", enrollmentId);
      if (dErr) throw new Error(dErr.message);
      const { count } = await supabase
        .from("campaign_enrollments")
        .select("*", { count: "exact", head: true })
        .eq("campaign_id", campaignId);
      await supabase.from("campaigns").update({ leads_count: count ?? 0 }).eq("id", campaignId);
      return NextResponse.json({ ok: true as const, data: { removed: true } });
    }

    if (action === "pause") {
      const { error } = await supabase
        .from("campaign_enrollments")
        .update({ status: "paused", updated_at: new Date().toISOString() })
        .eq("id", enrollmentId);
      if (error) throw new Error(error.message);
      return NextResponse.json({ ok: true as const, data: { status: "paused" } });
    }

    if (action === "resume") {
      const { error } = await supabase
        .from("campaign_enrollments")
        .update({ status: "active", updated_at: new Date().toISOString() })
        .eq("id", enrollmentId);
      if (error) throw new Error(error.message);
      return NextResponse.json({ ok: true as const, data: { status: "active" } });
    }

    if (action === "skip") {
      const { data: camp, error: cErr } = await supabase.from("campaigns").select("sequence").eq("id", campaignId).single();
      if (cErr) throw new Error(cErr.message);
      const steps = parseSequence(camp.sequence);
      const nextIdx = row.current_step_index + 1;
      const completed = nextIdx >= steps.length;
      let nextSendAfter: string | null = null;
      if (!completed) {
        const nextStep = steps[nextIdx];
        const wait = nextStep?.delayKind === "wait_days" ? nextStep.delayDays : 0;
        nextSendAfter = addDaysIso(new Date().toISOString(), wait);
      }
      const { error } = await supabase
        .from("campaign_enrollments")
        .update({
          current_step_index: nextIdx,
          status: completed ? "completed" : "active",
          next_send_after: nextSendAfter,
          updated_at: new Date().toISOString(),
        })
        .eq("id", enrollmentId);
      if (error) throw new Error(error.message);
      return NextResponse.json({
        ok: true as const,
        data: { currentStepIndex: nextIdx, status: completed ? "completed" : "active" },
      });
    }

    return NextResponse.json({ ok: false as const, error: "Unsupported" }, { status: 400 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server error";
    const status = msg.includes("is not set") ? 503 : 500;
    return NextResponse.json({ ok: false as const, error: msg }, { status });
  }
}
