import { NextResponse } from "next/server";
import { z } from "zod";

import type { TablesInsert } from "@/lib/db/database.types";
import { createLead, createServerSupabaseClient, updateLead } from "@/lib/db/supabase";
import { applyLeadListFilters, fetchLatestOutreachByLeadIds } from "@/lib/leads/api-query";
import { mapLeadRow, mergeEnrichment } from "@/lib/leads/mappers";
import { fingerprintRawLeadData } from "@/lib/ai/lead-score-throttle";
import { scoreAndAnalyzeLead } from "@/lib/ai/lead-scorer";

export const dynamic = "force-dynamic";

const leadStatuses = z.enum([
  "new",
  "contacted",
  "qualified",
  "meeting",
  "proposal",
  "won",
  "lost",
]);
const serviceTypes = z.enum([
  "webapp",
  "mobileapp",
  "automation",
  "network",
  "security_cam",
  "software",
]);

const listQuerySchema = z.object({
  search: z.string().optional(),
  status: leadStatuses.optional(),
  serviceType: serviceTypes.optional(),
  minScore: z.coerce.number().optional(),
  maxScore: z.coerce.number().optional(),
  sort: z.enum(["created_at", "updated_at", "lead_score", "company_name"]).optional(),
  order: z.enum(["asc", "desc"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

const createBodySchema = z.object({
  companyName: z.string().min(1),
  contactName: z.string().optional(),
  email: z.string().email(),
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
  website: z.string().optional(),
  industry: z.string().optional(),
  serviceTypes: z.array(serviceTypes).min(1),
  source: z.string().optional(),
  initialNotes: z.string().optional(),
  manualScore: z.number().int().min(0).max(100).nullable().optional(),
  skipAi: z.boolean().optional(),
});

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const parsed = listQuerySchema.safeParse(Object.fromEntries(url.searchParams.entries()));
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false as const, error: "Invalid query", issues: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const { search, status, serviceType, minScore, maxScore, sort, order, page, pageSize } =
      parsed.data;
    const supabase = createServerSupabaseClient();

    const filters = {
      search,
      status,
      serviceType,
      minScore,
      maxScore,
      sortBy: sort,
      sortDir: order,
    };

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const q = applyLeadListFilters(supabase, filters);
    const { data, error, count } = await q.range(from, to);
    if (error) throw new Error(error.message);

    const rows = data ?? [];
    const ids = rows.map((r) => r.id);
    const outreachLatest = await fetchLatestOutreachByLeadIds(supabase, ids);

    const leads = rows.map((r) => {
      const ev = outreachLatest.get(r.id);
      const last = ev && ev > r.updated_at ? ev : r.updated_at;
      return mapLeadRow(r, last);
    });

    return NextResponse.json({
      ok: true as const,
      data: {
        leads,
        total: count ?? 0,
        page,
        pageSize,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server error";
    const status = msg.includes("is not set") ? 503 : 500;
    return NextResponse.json({ ok: false as const, error: msg }, { status });
  }
}

export async function POST(req: Request) {
  try {
    const json: unknown = await req.json();
    const parsed = createBodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false as const, error: "Invalid body", issues: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const b = parsed.data;
    const primary = b.serviceTypes[0]!;
    const enrichment = mergeEnrichment(
      {},
      {
        service_types: b.serviceTypes,
        initial_notes: b.initialNotes ?? null,
      }
    );

    const insert: TablesInsert<"leads"> = {
      company_name: b.companyName,
      contact_name: b.contactName ?? null,
      email: b.email,
      phone: b.phone ?? null,
      whatsapp: b.whatsapp ?? null,
      website: b.website || null,
      industry: b.industry ?? null,
      service_type: primary,
      lead_score: b.manualScore ?? 0,
      status: "new",
      source: b.source ?? null,
      enrichment_data: enrichment,
      ai_notes: b.initialNotes ?? null,
    };

    let lead = await createLead(insert);

    if (!b.skipAi && b.manualScore == null) {
      try {
        const analysis = await scoreAndAnalyzeLead({
          companyName: lead.company_name,
          contactName: lead.contact_name ?? undefined,
          email: lead.email ?? undefined,
          phone: lead.phone ?? undefined,
          website: lead.website ?? undefined,
          industry: lead.industry ?? undefined,
          signals: (enrichment as { service_types?: string[] }).service_types,
        });
        const scoreFingerprint = fingerprintRawLeadData({
          companyName: lead.company_name,
          contactName: lead.contact_name ?? undefined,
          email: lead.email ?? undefined,
          phone: lead.phone ?? undefined,
          website: lead.website ?? undefined,
          industry: lead.industry ?? undefined,
          signals: (enrichment as { service_types?: string[] }).service_types,
        });
        const nextEnrichment = mergeEnrichment(lead.enrichment_data, {
          last_ai_analysis: analysis,
          ai_scoring: { at: new Date().toISOString(), fingerprint: scoreFingerprint },
          service_types: b.serviceTypes,
        });
        lead = await updateLead(lead.id, {
          lead_score: analysis.score,
          enrichment_data: nextEnrichment,
        });
      } catch {
        /* scoring optional on create */
      }
    }

    return NextResponse.json({ ok: true as const, data: mapLeadRow(lead) });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server error";
    const status = msg.includes("is not set") ? 503 : 500;
    return NextResponse.json({ ok: false as const, error: msg }, { status });
  }
}
