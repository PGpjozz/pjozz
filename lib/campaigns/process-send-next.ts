import { createServerSupabaseClient, type Tables } from "@/lib/db/supabase";
import { sendEmail } from "@/lib/email/resend";
import { sendWhatsAppMessage, stripHtmlForWhatsApp } from "@/lib/whatsapp/twilio";
import { addDaysIso, isWithinSendWindow } from "@/lib/campaigns/send-window";
import { parseCampaignSettings, parseSequence } from "@/lib/campaigns/parse";
import type { OutreachSequenceStep } from "@/types";

function appBaseUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  const vercel = process.env.VERCEL_URL;
  if (vercel) return `https://${vercel.replace(/\/$/, "")}`;
  throw new Error("NEXT_PUBLIC_APP_URL or VERCEL_URL is required for email tracking links");
}

function utcDayStartIso(d = new Date()): string {
  const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
  return x.toISOString();
}

async function countSendsToday(supabase: ReturnType<typeof createServerSupabaseClient>, campaignId: string): Promise<number> {
  const since = utcDayStartIso();
  const types = ["email_sent", "whatsapp_sent", "linkedin_connected"] as const;
  const counts = await Promise.all(
    types.map((t) =>
      supabase
        .from("outreach_events")
        .select("*", { count: "exact", head: true })
        .eq("campaign_id", campaignId)
        .eq("type", t)
        .gte("created_at", since)
    )
  );
  for (const c of counts) {
    if (c.error) throw new Error(c.error.message);
  }
  return counts.reduce((s, c) => s + (c.count ?? 0), 0);
}

async function isSuppressed(supabase: ReturnType<typeof createServerSupabaseClient>, email: string | null): Promise<boolean> {
  if (!email?.trim()) return true;
  const key = email.trim().toLowerCase();
  const { data } = await supabase.from("email_suppressions").select("email").eq("email", key).maybeSingle();
  return !!data;
}

function eventTypeForChannel(ch: OutreachSequenceStep["channel"]): Tables<"outreach_events">["type"] {
  if (ch === "whatsapp") return "whatsapp_sent";
  if (ch === "linkedin") return "linkedin_connected";
  return "email_sent";
}

export async function runCampaignSendNext(campaignId: string): Promise<{
  sent: number;
  skipped: string | null;
  errors: string[];
}> {
  const supabase = createServerSupabaseClient();
  const errors: string[] = [];
  const { data: campaign, error: cErr } = await supabase.from("campaigns").select("*").eq("id", campaignId).maybeSingle();
  if (cErr) throw new Error(cErr.message);
  if (!campaign) throw new Error("Campaign not found");
  if (campaign.status !== "active") return { sent: 0, skipped: "campaign_not_active", errors };

  const settings = parseCampaignSettings(campaign.settings);
  const sequence = parseSequence(campaign.sequence);
  if (!sequence.length) return { sent: 0, skipped: "empty_sequence", errors };

  const now = new Date();
  if (!isWithinSendWindow(now, settings.sendWindow)) {
    return { sent: 0, skipped: "outside_send_window", errors };
  }

  const sentToday = await countSendsToday(supabase, campaignId);
  let remaining = Math.max(0, settings.dailySendLimit - sentToday);
  if (remaining <= 0) return { sent: 0, skipped: "daily_limit_reached", errors };

  const { data: enrollments, error: eErr } = await supabase
    .from("campaign_enrollments")
    .select("*, leads(*)")
    .eq("campaign_id", campaignId)
    .eq("status", "active")
    .or(`next_send_after.is.null,next_send_after.lte.${now.toISOString()}`)
    .order("next_send_after", { ascending: true, nullsFirst: true })
    .limit(remaining);

  if (eErr) throw new Error(eErr.message);
  const rows = enrollments ?? [];

  let sent = 0;
  const baseUrl = appBaseUrl();

  for (const row of rows) {
    if (remaining <= 0) break;
    const lead = row.leads as Tables<"leads"> | null;
    if (!lead) continue;

    const stepIndex = row.current_step_index;
    const step = sequence[stepIndex];
    if (!step) {
      await supabase
        .from("campaign_enrollments")
        .update({ status: "completed", next_send_after: null, updated_at: now.toISOString() })
        .eq("id", row.id);
      continue;
    }

    if (await isSuppressed(supabase, lead.email)) {
      await supabase
        .from("campaign_enrollments")
        .update({ status: "unsubscribed", updated_at: now.toISOString() })
        .eq("id", row.id);
      continue;
    }

    const nextIdx = stepIndex + 1;
    let nextSendAfter: string | null = null;
    let newStatus = row.status;

    if (nextIdx >= sequence.length) {
      newStatus = "completed";
    } else {
      const nextStep = sequence[nextIdx];
      const wait = nextStep.delayKind === "wait_days" ? nextStep.delayDays : 0;
      nextSendAfter = addDaysIso(now.toISOString(), wait);
    }

    try {
      if (step.channel === "email") {
        if (!lead.email?.trim() || !step.body?.trim()) {
          errors.push(`skip ${lead.id}: missing email or body`);
          continue;
        }
        const subject = step.subject?.trim() || "Message from Pjozz Technologies";
        const { id: resendId } = await sendEmail({
          to: lead.email.trim(),
          subject,
          html: step.body,
          text: step.body.replace(/<[^>]+>/g, " ").slice(0, 8000),
          fromName: "Pjozz",
          tags: {
            campaign_id: campaignId,
            enrollment_id: row.id,
            lead_id: lead.id,
          },
          tracking: {
            baseUrl,
            enrollmentId: row.id,
            campaignId,
            leadId: lead.id,
          },
        });

        await supabase.from("outreach_events").insert({
          lead_id: lead.id,
          campaign_id: campaignId,
          type: "email_sent",
          metadata: { enrollment_id: row.id, step_index: stepIndex, resend_email_id: resendId },
        });
      } else if (step.channel === "whatsapp") {
        const to = lead.whatsapp?.trim() || lead.phone?.trim();
        if (!to || !step.body?.trim()) {
          errors.push(`skip ${lead.id}: missing whatsapp/phone or body`);
          continue;
        }
        const textBody = stripHtmlForWhatsApp(step.body);
        const { sid } = await sendWhatsAppMessage({ to, body: textBody });
        await supabase.from("outreach_events").insert({
          lead_id: lead.id,
          campaign_id: campaignId,
          type: "whatsapp_sent",
          metadata: { enrollment_id: row.id, step_index: stepIndex, twilio_sid: sid },
        });
      } else {
        await supabase.from("outreach_events").insert({
          lead_id: lead.id,
          campaign_id: campaignId,
          type: eventTypeForChannel(step.channel),
          metadata: {
            enrollment_id: row.id,
            step_index: stepIndex,
            note: "Automated sequence advance — deliver via external channel.",
            body_preview: step.body.slice(0, 500),
          },
        });
      }

      await supabase
        .from("campaign_enrollments")
        .update({
          current_step_index: nextIdx,
          next_send_after: nextSendAfter,
          status: newStatus,
          updated_at: now.toISOString(),
        })
        .eq("id", row.id);

      const nextSent = (campaign.sent_count ?? 0) + 1;
      await supabase.from("campaigns").update({ sent_count: nextSent }).eq("id", campaignId);
      campaign.sent_count = nextSent;

      sent += 1;
      remaining -= 1;
    } catch (e) {
      errors.push(e instanceof Error ? e.message : String(e));
    }
  }

  return { sent, skipped: sent ? null : errors.length ? "send_errors" : "no_eligible_enrollments", errors };
}
