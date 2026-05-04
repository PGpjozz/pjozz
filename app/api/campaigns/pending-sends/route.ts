import { NextResponse } from "next/server";

import { assertAutomationInbound } from "@/lib/automation/auth";
import { createServerSupabaseClient } from "@/lib/db/supabase";

export const dynamic = "force-dynamic";

/**
 * Campaigns that have at least one **active** enrollment due for the next step
 * (`next_send_after` null or in the past). `send-next` still enforces SAST window + daily cap.
 */
export async function GET(req: Request) {
  try {
    assertAutomationInbound(req);
    const supabase = createServerSupabaseClient();
    const now = new Date().toISOString();

    const { data: campaigns, error: cErr } = await supabase.from("campaigns").select("id").eq("status", "active");
    if (cErr) throw new Error(cErr.message);
    const ids = (campaigns ?? []).map((c) => c.id);
    if (ids.length === 0) {
      return NextResponse.json({ ok: true as const, data: { campaigns: [] as { id: string }[] } });
    }

    const { data: nullDue, error: nErr } = await supabase
      .from("campaign_enrollments")
      .select("campaign_id")
      .in("campaign_id", ids)
      .eq("status", "active")
      .is("next_send_after", null);
    if (nErr) throw new Error(nErr.message);

    const { data: pastDue, error: pErr } = await supabase
      .from("campaign_enrollments")
      .select("campaign_id")
      .in("campaign_id", ids)
      .eq("status", "active")
      .lte("next_send_after", now);
    if (pErr) throw new Error(pErr.message);

    const pending = new Set<string>();
    for (const r of nullDue ?? []) pending.add(r.campaign_id);
    for (const r of pastDue ?? []) pending.add(r.campaign_id);

    return NextResponse.json({
      ok: true as const,
      data: { campaigns: Array.from(pending).map((id) => ({ id })) },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server error";
    const status = msg === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ ok: false as const, error: msg }, { status });
  }
}
