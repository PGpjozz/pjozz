import { NextResponse } from "next/server";

import { createServerSupabaseClient } from "@/lib/db/supabase";
import { verifyEmailTrackingToken } from "@/lib/email/tracking";

export const dynamic = "force-dynamic";

const GIF = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64"
);

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("t");
  if (token) {
    const payload = verifyEmailTrackingToken(token);
    if (payload?.kind === "open") {
      try {
        const supabase = createServerSupabaseClient();
        await supabase.from("outreach_events").insert({
          lead_id: payload.leadId,
          campaign_id: payload.campaignId,
          type: "email_opened",
          metadata: { enrollment_id: payload.enrollmentId, source: "pixel" },
        });
        const { data: camp } = await supabase.from("campaigns").select("opened_count").eq("id", payload.campaignId).maybeSingle();
        const next = (camp?.opened_count ?? 0) + 1;
        const { data: sentRow } = await supabase
          .from("campaigns")
          .select("sent_count")
          .eq("id", payload.campaignId)
          .maybeSingle();
        const sent = Math.max(1, sentRow?.sent_count ?? 1);
        const openRate = Math.round((next / sent) * 1000) / 10;
        await supabase
          .from("campaigns")
          .update({ opened_count: next, open_rate: openRate })
          .eq("id", payload.campaignId);
      } catch {
        /* ignore tracking failures */
      }
    }
  }

  return new NextResponse(GIF, {
    status: 200,
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    },
  });
}
