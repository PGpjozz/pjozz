import { NextResponse } from "next/server";
import { z } from "zod";

import type { TablesInsert } from "@/lib/db/database.types";
import { publicApiError } from "@/lib/api-error";
import { createLead, createServerSupabaseClient, updateLead, upsertPipelineForLead } from "@/lib/db/supabase";
import { applyLeadListFilters, fetchLatestOutreachByLeadIds } from "@/lib/leads/api-query";
import { mapLeadRow, mergeEnrichment } from "@/lib/leads/mappers";
import { fingerprintRawLeadData } from "@/lib/ai/lead-score-throttle";
import { scoreAndAnalyzeLead } from "@/lib/ai/lead-scorer";
import { leadStatusToDefaultStage } from "@/lib/pipeline/kanban";
import { getSetting } from "@/lib/settings/store";

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
  companyName: z.string().min(1, "Company name is required"),
  contactName: z.string().optional(),
  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .email("Enter a valid email address"),
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
  website: z.string().optional(),
  industry: z.string().optional(),
  serviceTypes: z.array(serviceTypes).min(1, "Pick at least one service type"),
  source: z.string().optional(),
  initialNotes: z.string().optional(),
  manualScore: z.number().int().min(0).max(100).nullable().optional(),
  skipAi: z.boolean().optional(),
});

function formatZodError(error: z.ZodError): string {
  const field = error.flatten().fieldErrors as Record<string, string[] | undefined>;
  const parts = Object.entries(field).flatMap(([k, msgs]) =>
    (msgs ?? []).map((m) => `${k}: ${m}`)
  );
  return parts[0] ?? error.issues[0]?.message ?? "Invalid body";
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const parsed = listQuerySchema.safeParse(Object.fromEntries(url.searchParams.entries()));
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false as const, error: formatZodError(parsed.error), issues: parsed.error.flatten() },
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
    const msg = publicApiError(e);
    const status = msg.includes("is not set") || msg.includes("Cannot reach") ? 503 : 500;
    return NextResponse.json({ ok: false as const, error: msg }, { status });
  }
}

export async function POST(req: Request) {
  try {
    let json: unknown;
    try {
      json = await req.json();
    } catch {
      return NextResponse.json({ ok: false as const, error: "Expected JSON body." }, { status: 400 });
    }

    const parsed = createBodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false as const, error: formatZodError(parsed.error), issues: parsed.error.flatten() },
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
      company_name: b.companyName.trim(),
      contact_name: b.contactName?.trim() || null,
      email: b.email.trim().toLowerCase(),
      phone: b.phone?.trim() || null,
      whatsapp: b.whatsapp?.trim() || null,
      website: b.website?.trim() || null,
      industry: b.industry?.trim() || null,
      service_type: primary,
      lead_score: b.manualScore ?? 0,
      status: "new",
      source: b.source?.trim() || "manual",
      enrichment_data: enrichment,
      ai_notes: b.initialNotes?.trim() || null,
    };

    let lead = await createLead(insert);

    try {
      await upsertPipelineForLead(lead.id, {
        stage: leadStatusToDefaultStage("new"),
        probability: 20,
        deal_value: null,
        expected_close_date: null,
        notes: null,
      });
    } catch (pipeErr) {
      console.error("[api/leads] pipeline seed failed:", pipeErr);
    }

    const flags = await getSetting("features.flags");
    const shouldScore = flags.enableAi !== false && !b.skipAi && b.manualScore == null;

    if (shouldScore) {
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
    const msg = publicApiError(e);
    const status = msg.includes("is not set") || msg.includes("Cannot reach") ? 503 : 500;
    return NextResponse.json({ ok: false as const, error: msg }, { status });
  }
}
