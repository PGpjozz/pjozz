import { createServerSupabaseClient } from "@/lib/db/supabase";
import { parseCampaignSettings } from "@/lib/campaigns/parse";

type ResendEmailPayload = {
  email_id?: string;
  to?: string[];
  tags?: Record<string, string>;
  click?: { link?: string };
  bounce?: { type?: string; message?: string };
};

type ResendWebhookBody = {
  type?: string;
  data?: ResendEmailPayload;
};

export async function processResendEmailWebhook(body: ResendWebhookBody): Promise<{ ok: true; handled: string } | { ok: false; error: string }> {
  const type = body.type ?? "";
  const data = body.data ?? {};
  const tags = data.tags ?? {};
  const campaignId = tags.campaign_id;
  const enrollmentId = tags.enrollment_id;
  const leadId = tags.lead_id;

  const supabase = createServerSupabaseClient();

  if (type === "email.bounced" || type === "email.failed") {
    if (campaignId && enrollmentId && leadId) {
      await supabase
        .from("campaign_enrollments")
        .update({ status: "bounced", updated_at: new Date().toISOString() })
        .eq("id", enrollmentId);
      await supabase.from("outreach_events").insert({
        lead_id: leadId,
        campaign_id: campaignId,
        type: "email_bounced",
        metadata: { enrollment_id: enrollmentId, email_id: data.email_id, bounce: data.bounce },
      });
    }
    return { ok: true, handled: type };
  }

  if (type === "email.complained") {
    const email = data.to?.[0]?.toLowerCase();
    if (email) {
      await supabase.from("email_suppressions").upsert(
        { email, reason: "complained", source_campaign_id: campaignId ?? null },
        { onConflict: "email" }
      );
    }
    if (campaignId && enrollmentId && leadId) {
      await supabase
        .from("campaign_enrollments")
        .update({ status: "unsubscribed", updated_at: new Date().toISOString() })
        .eq("id", enrollmentId);
      await supabase.from("outreach_events").insert({
        lead_id: leadId,
        campaign_id: campaignId,
        type: "email_complained",
        metadata: { enrollment_id: enrollmentId, email_id: data.email_id },
      });
      if (campaignId) {
        const { data: camp } = await supabase.from("campaigns").select("settings").eq("id", campaignId).maybeSingle();
        const settings = parseCampaignSettings(camp?.settings ?? null);
        if (settings.blocklistOnUnsubscribe && email) {
          await supabase.from("email_suppressions").upsert(
            { email, reason: "complained", source_campaign_id: campaignId },
            { onConflict: "email" }
          );
        }
      }
    }
    return { ok: true, handled: "email.complained" };
  }

  if (type === "email.opened" && campaignId && leadId) {
    await supabase.from("outreach_events").insert({
      lead_id: leadId,
      campaign_id: campaignId,
      type: "email_opened",
      metadata: { enrollment_id: enrollmentId, email_id: data.email_id, source: "resend" },
    });
    return { ok: true, handled: "email.opened" };
  }

  if (type === "email.clicked" && campaignId && leadId) {
    await supabase.from("outreach_events").insert({
      lead_id: leadId,
      campaign_id: campaignId,
      type: "email_clicked",
      metadata: { enrollment_id: enrollmentId, email_id: data.email_id, link: data.click?.link },
    });
    return { ok: true, handled: "email.clicked" };
  }

  if (type === "email.received" && campaignId && enrollmentId && leadId) {
    const { data: camp } = await supabase.from("campaigns").select("settings").eq("id", campaignId).maybeSingle();
    const settings = parseCampaignSettings(camp?.settings ?? null);
    if (settings.pauseOnReply) {
      await supabase
        .from("campaign_enrollments")
        .update({ status: "replied", updated_at: new Date().toISOString() })
        .eq("id", enrollmentId);
    }
    await supabase.from("outreach_events").insert({
      lead_id: leadId,
      campaign_id: campaignId,
      type: "email_replied",
      metadata: { enrollment_id: enrollmentId, email_id: data.email_id },
    });
    const { data: c2 } = await supabase.from("campaigns").select("replied_count").eq("id", campaignId).maybeSingle();
    const next = (c2?.replied_count ?? 0) + 1;
    const { data: sentRow } = await supabase.from("campaigns").select("sent_count").eq("id", campaignId).maybeSingle();
    const sent = Math.max(1, sentRow?.sent_count ?? 1);
    const replyRate = Math.round((next / sent) * 1000) / 10;
    await supabase.from("campaigns").update({ replied_count: next, reply_rate: replyRate }).eq("id", campaignId);
    return { ok: true, handled: "email.received" };
  }

  return { ok: true, handled: "ignored" };
}
