import { NextResponse } from "next/server";
import { z } from "zod";

import {
  createServerSupabaseClient,
  getLeadById,
  getPipelineForLead,
  updateLead,
  upsertPipelineForLead,
} from "@/lib/db/supabase";
import { fetchLatestOutreachByLeadIds } from "@/lib/leads/api-query";
import { mapLeadRow, mergeEnrichment } from "@/lib/leads/mappers";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  companyName: z.string().min(1).optional(),
  contactName: z.string().nullable().optional(),
  email: z.string().email().nullable().optional(),
  phone: z.string().nullable().optional(),
  whatsapp: z.string().nullable().optional(),
  website: z.string().nullable().optional(),
  industry: z.string().nullable().optional(),
  serviceType: z
    .enum(["webapp", "mobileapp", "automation", "network", "security_cam", "software"])
    .nullable()
    .optional(),
  leadScore: z.number().int().min(0).max(100).optional(),
  status: z
    .enum(["new", "contacted", "qualified", "meeting", "proposal", "won", "lost"])
    .optional(),
  source: z.string().nullable().optional(),
  enrichmentData: z.unknown().optional(),
  aiNotes: z.string().nullable().optional(),
  /** Kanban column title — updates `pipeline.stage` while preserving other pipeline fields. */
  pipelineStage: z.string().min(1).optional(),
});

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const lead = await getLeadById(id);
    if (!lead) {
      return NextResponse.json({ ok: false as const, error: "Not found" }, { status: 404 });
    }
    const supabase = createServerSupabaseClient();
    const outreach = await fetchLatestOutreachByLeadIds(supabase, [id]);
    const ev = outreach.get(id);
    const last = ev && ev > lead.updated_at ? ev : lead.updated_at;
    return NextResponse.json({ ok: true as const, data: mapLeadRow(lead, last) });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server error";
    const status = msg.includes("is not set") ? 503 : 500;
    return NextResponse.json({ ok: false as const, error: msg }, { status });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const existing = await getLeadById(id);
    if (!existing) {
      return NextResponse.json({ ok: false as const, error: "Not found" }, { status: 404 });
    }
    const json: unknown = await req.json();
    const parsed = patchSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false as const, error: "Invalid body", issues: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const p = parsed.data;
    const update: Record<string, unknown> = {};
    if (p.companyName !== undefined) update.company_name = p.companyName;
    if (p.contactName !== undefined) update.contact_name = p.contactName;
    if (p.email !== undefined) update.email = p.email;
    if (p.phone !== undefined) update.phone = p.phone;
    if (p.whatsapp !== undefined) update.whatsapp = p.whatsapp;
    if (p.website !== undefined) update.website = p.website;
    if (p.industry !== undefined) update.industry = p.industry;
    if (p.serviceType !== undefined) update.service_type = p.serviceType;
    if (p.leadScore !== undefined) update.lead_score = p.leadScore;
    if (p.status !== undefined) update.status = p.status;
    if (p.source !== undefined) update.source = p.source;
    if (p.aiNotes !== undefined) update.ai_notes = p.aiNotes;
    if (p.enrichmentData !== undefined) {
      update.enrichment_data = mergeEnrichment(existing.enrichment_data, p.enrichmentData as Record<string, unknown>);
    }

    let lead = await updateLead(id, update as Parameters<typeof updateLead>[1]);

    if (p.pipelineStage) {
      const pipe = await getPipelineForLead(id);
      await upsertPipelineForLead(id, {
        stage: p.pipelineStage,
        probability: pipe?.probability ?? 20,
        deal_value: pipe?.deal_value ?? null,
        expected_close_date: pipe?.expected_close_date ?? null,
        notes: pipe?.notes ?? null,
      });
    }

    lead = (await getLeadById(id)) ?? lead;
    const supabase = createServerSupabaseClient();
    const outreach = await fetchLatestOutreachByLeadIds(supabase, [id]);
    const ev = outreach.get(id);
    const last = ev && ev > lead.updated_at ? ev : lead.updated_at;
    return NextResponse.json({ ok: true as const, data: mapLeadRow(lead, last) });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server error";
    const status = msg.includes("is not set") ? 503 : 500;
    return NextResponse.json({ ok: false as const, error: msg }, { status });
  }
}
