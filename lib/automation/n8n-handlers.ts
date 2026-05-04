import type { Json, TablesInsert } from "@/lib/db/database.types";
import { fingerprintRawLeadData } from "@/lib/ai/lead-score-throttle";
import { scoreAndAnalyzeLead } from "@/lib/ai/lead-scorer";
import { runCampaignSendNext } from "@/lib/campaigns/process-send-next";
import { parseCampaignSettings } from "@/lib/campaigns/parse";
import { createServerSupabaseClient, createLead, updateLead } from "@/lib/db/supabase";
import { mapLeadRow, mergeEnrichment } from "@/lib/leads/mappers";

const SERVICE_TYPES = ["webapp", "mobileapp", "automation", "network", "security_cam", "software"] as const;

function normalizeServiceType(v: string | undefined): (typeof SERVICE_TYPES)[number] {
  const s = (v ?? "webapp").toLowerCase().replace(/-/g, "_");
  if (SERVICE_TYPES.includes(s as (typeof SERVICE_TYPES)[number])) return s as (typeof SERVICE_TYPES)[number];
  return "webapp";
}

export async function handleLeadScraped(lead: {
  companyName: string;
  email: string;
  contactName?: string | null;
  phone?: string | null;
  website?: string | null;
  industry?: string | null;
  serviceType?: string | null;
  notes?: string | null;
}): Promise<{ ok: true; created: boolean; leadId?: string; skipped?: string }> {
  const supabase = createServerSupabaseClient();
  const email = lead.email.trim().toLowerCase();
  const { data: existing } = await supabase.from("leads").select("id").ilike("email", email).maybeSingle();
  if (existing) return { ok: true, created: false, skipped: "already_exists", leadId: existing.id };

  const primary = normalizeServiceType(lead.serviceType ?? undefined);
  const enrichment = mergeEnrichment(
    {},
    {
      source: "n8n_scraper",
      scraper_notes: lead.notes ?? null,
    }
  );

  const insert: TablesInsert<"leads"> = {
    company_name: lead.companyName.trim(),
    contact_name: lead.contactName?.trim() || null,
    email: lead.email.trim(),
    phone: lead.phone?.trim() || null,
    whatsapp: null,
    website: lead.website?.trim() || null,
    industry: lead.industry?.trim() || null,
    service_type: primary,
    lead_score: 0,
    status: "new",
    source: "n8n_scraper",
    enrichment_data: enrichment,
    ai_notes: lead.notes?.trim() || null,
  };

  let row = await createLead(insert);

  try {
    const scoreInput = {
      companyName: row.company_name,
      contactName: row.contact_name ?? undefined,
      email: row.email ?? undefined,
      phone: row.phone ?? undefined,
      website: row.website ?? undefined,
      industry: row.industry ?? undefined,
      signals: ["n8n_scraper"],
    };
    const analysis = await scoreAndAnalyzeLead(scoreInput);
    const fp = fingerprintRawLeadData(scoreInput);
    row = await updateLead(row.id, {
      lead_score: analysis.score,
      enrichment_data: mergeEnrichment(row.enrichment_data, {
        last_ai_analysis: analysis,
        ai_scoring: { at: new Date().toISOString(), fingerprint: fp },
      }),
    });
  } catch {
    /* scoring optional */
  }

  return { ok: true, created: true, leadId: row.id };
}

export async function handleEmailReplyDetected(payload: {
  email: string;
  leadId?: string | null;
  campaignId?: string | null;
  enrollmentId?: string | null;
  subject?: string | null;
  snippet?: string | null;
}): Promise<{ ok: true }> {
  const supabase = createServerSupabaseClient();
  const email = payload.email.trim().toLowerCase();

  let leadId = payload.leadId ?? null;
  if (!leadId) {
    const { data: lead } = await supabase.from("leads").select("id").ilike("email", email).maybeSingle();
    leadId = lead?.id ?? null;
  }
  if (!leadId) return { ok: true };

  await updateLead(leadId, { status: "contacted", updated_at: new Date().toISOString() });

  if (payload.campaignId && payload.enrollmentId) {
    const { data: camp } = await supabase.from("campaigns").select("settings").eq("id", payload.campaignId).maybeSingle();
    const settings = parseCampaignSettings((camp?.settings ?? null) as Json | null);
    if (settings.pauseOnReply) {
      await supabase
        .from("campaign_enrollments")
        .update({ status: "replied", updated_at: new Date().toISOString() })
        .eq("id", payload.enrollmentId);
    }
  } else {
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
  }

  const msg = `Inbound reply detected for ${email}${payload.subject ? `: ${payload.subject}` : ""}.`;
  await supabase.from("ai_insights").insert({
    type: "action_required",
    message: msg + (payload.snippet ? ` Snippet: ${payload.snippet.slice(0, 280)}` : ""),
    priority: "high",
    related_id: leadId,
    related_type: "lead",
    is_read: false,
  });

  await supabase.from("outreach_events").insert({
    lead_id: leadId,
    campaign_id: payload.campaignId ?? null,
    type: "email_replied",
    metadata: { source: "n8n", subject: payload.subject, snippet: payload.snippet } as Json,
  });

  return { ok: true };
}

export async function handleMeetingBooked(payload: {
  leadId?: string | null;
  email?: string | null;
  calendlyPayload?: unknown;
}): Promise<{ ok: true; leadId?: string | null }> {
  const supabase = createServerSupabaseClient();
  let leadId = payload.leadId ?? null;
  if (!leadId && payload.email) {
    const em = payload.email.trim().toLowerCase();
    const { data: lead } = await supabase.from("leads").select("id").ilike("email", em).maybeSingle();
    leadId = lead?.id ?? null;
  }
  if (!leadId) return { ok: true, leadId: null };

  await updateLead(leadId, { status: "meeting", updated_at: new Date().toISOString() });

  await supabase.from("ai_insights").insert({
    type: "opportunity",
    message: "Meeting booked (Calendly / n8n). Move pipeline and prep agenda.",
    priority: "medium",
    related_id: leadId,
    related_type: "lead",
    is_read: false,
  });

  await supabase.from("outreach_events").insert({
    lead_id: leadId,
    campaign_id: null,
    type: "meeting_booked",
    metadata: { source: "n8n", calendly: payload.calendlyPayload ?? null } as Json,
  });

  return { ok: true, leadId };
}

export async function handleCampaignStepDue(payload: { campaignId: string }): Promise<{
  ok: true;
  result: Awaited<ReturnType<typeof runCampaignSendNext>>;
}> {
  const result = await runCampaignSendNext(payload.campaignId);
  return { ok: true, result };
}

export async function findLeadByEmail(email: string) {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.from("leads").select("*").ilike("email", email.trim()).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return mapLeadRow(data);
}

export async function checkLeadEmailExists(email: string): Promise<{ exists: boolean; leadId?: string }> {
  const supabase = createServerSupabaseClient();
  const { data } = await supabase.from("leads").select("id").ilike("email", email.trim()).maybeSingle();
  return { exists: !!data, leadId: data?.id };
}
