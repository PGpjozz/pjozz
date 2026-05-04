import { NextResponse } from "next/server";

import { createServerSupabaseClient } from "@/lib/db/supabase";
import { verifyEmailTrackingToken } from "@/lib/email/tracking";
import { parseCampaignSettings } from "@/lib/campaigns/parse";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("t");
  const payload = token ? verifyEmailTrackingToken(token) : null;

  if (!payload || payload.kind !== "unsub") {
    return new NextResponse(
      `<!DOCTYPE html><html><body style="font-family:system-ui;padding:2rem;background:#0a0a0a;color:#eee"><p>Invalid unsubscribe link.</p></body></html>`,
      { status: 400, headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  }

  try {
    const supabase = createServerSupabaseClient();
    const { data: lead } = await supabase.from("leads").select("email").eq("id", payload.leadId).maybeSingle();
    const { data: campaign } = await supabase.from("campaigns").select("settings").eq("id", payload.campaignId).maybeSingle();

    await supabase
      .from("campaign_enrollments")
      .update({ status: "unsubscribed", updated_at: new Date().toISOString() })
      .eq("id", payload.enrollmentId);

    await supabase.from("outreach_events").insert({
      lead_id: payload.leadId,
      campaign_id: payload.campaignId,
      type: "email_unsubscribed",
      metadata: { enrollment_id: payload.enrollmentId },
    });

    const settings = parseCampaignSettings(campaign?.settings ?? null);
    const email = lead?.email?.trim().toLowerCase();
    if (settings.blocklistOnUnsubscribe && email) {
      await supabase.from("email_suppressions").upsert(
        {
          email,
          reason: "unsubscribe",
          source_campaign_id: payload.campaignId,
        },
        { onConflict: "email" }
      );
    }
  } catch {
    /* still show confirmation */
  }

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"/><title>Unsubscribed</title></head>
<body style="font-family:system-ui;padding:2rem;background:#0a0a0a;color:#eee;max-width:32rem">
  <h1 style="color:#00e5a0;font-size:1.25rem">You’re unsubscribed</h1>
  <p style="color:#aaa;line-height:1.5">You won’t receive further messages from this campaign. If this was a mistake, contact Pjozz Technologies directly.</p>
</body></html>`;

  return new NextResponse(html, { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } });
}
