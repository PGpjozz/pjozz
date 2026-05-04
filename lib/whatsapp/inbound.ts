import type { Json } from "@/lib/db/database.types";
import { createServerSupabaseClient } from "@/lib/db/supabase";
import { parseCampaignSettings } from "@/lib/campaigns/parse";

import { formatWhatsAppAddress } from "./twilio";

/** Normalize `whatsapp:+2782…` → digits only for fuzzy match. */
function digitsOnly(s: string): string {
  return s.replace(/\D/g, "");
}

/**
 * Resolve a lead from inbound WhatsApp `From` by comparing phone / whatsapp fields (last 9–12 digits).
 */
export async function findLeadIdByInboundWhatsApp(fromRaw: string): Promise<string | null> {
  const formatted = formatWhatsAppAddress(fromRaw);
  if (!formatted) return null;
  const inbound = digitsOnly(formatted);
  const tail9 = inbound.slice(-9);
  const tail10 = inbound.slice(-10);

  const supabase = createServerSupabaseClient();
  const { data: rows, error } = await supabase
    .from("leads")
    .select("id, phone, whatsapp")
    .or(`phone.ilike.%${tail9}%,whatsapp.ilike.%${tail9}%,phone.ilike.%${tail10}%,whatsapp.ilike.%${tail10}%`)
    .limit(8);

  if (error) throw new Error(error.message);

  for (const row of rows ?? []) {
    const p = digitsOnly(row.phone ?? "");
    const w = digitsOnly(row.whatsapp ?? "");
    if (p && (inbound.endsWith(p) || p.endsWith(tail9) || p === inbound)) return row.id;
    if (w && (inbound.endsWith(w) || w.endsWith(tail9) || w === inbound)) return row.id;
  }
  return null;
}

export async function handleInboundWhatsAppReply(payload: {
  messageSid: string;
  from: string;
  to: string;
  body: string;
}): Promise<{ leadId: string | null }> {
  const supabase = createServerSupabaseClient();
  const leadId = await findLeadIdByInboundWhatsApp(payload.from);

  await supabase.from("outreach_events").insert({
    lead_id: leadId,
    campaign_id: null,
    type: "whatsapp_replied",
    metadata: {
      twilio_message_sid: payload.messageSid,
      from: payload.from,
      to: payload.to,
      body_preview: payload.body.slice(0, 500),
    } as Json,
  });

  if (leadId) {
    const { data: enrollments } = await supabase
      .from("campaign_enrollments")
      .select("id, campaign_id, campaigns ( settings )")
      .eq("lead_id", leadId)
      .eq("status", "active");

    type EnrRow = {
      id: string;
      campaign_id: string;
      campaigns: { settings: unknown } | { settings: unknown }[] | null;
    };

    for (const raw of enrollments ?? []) {
      const e = raw as EnrRow;
      const camp = e.campaigns;
      const settingsRaw = Array.isArray(camp) ? camp[0]?.settings : camp?.settings;
      const settings = parseCampaignSettings((settingsRaw ?? null) as Json | null);
      if (settings.pauseOnReply) {
        await supabase
          .from("campaign_enrollments")
          .update({ status: "replied", updated_at: new Date().toISOString() })
          .eq("id", e.id);
      }
    }

    await supabase.from("ai_insights").insert({
      type: "action_required",
      message: `WhatsApp reply from lead (${payload.from.slice(0, 24)}…): ${payload.body.slice(0, 200)}`,
      priority: "high",
      related_id: leadId,
      related_type: "lead",
      is_read: false,
    });
  }

  return { leadId };
}
