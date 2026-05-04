import { NextResponse } from "next/server";
import { z } from "zod";

import type { TablesInsert } from "@/lib/db/database.types";
import { createLead } from "@/lib/db/supabase";
import { mergeEnrichment } from "@/lib/leads/mappers";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  companyName: z.string().min(1).max(200),
  email: z.string().email(),
  budgetRange: z.string().max(120).optional(),
  timeline: z.string().max(200).optional(),
  notes: z.string().min(15).max(8000),
});

/** Procurement quote capture → CRM lead (source: quote_request). */
export async function POST(req: Request) {
  try {
    const json: unknown = await req.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false as const, error: "Invalid body", issues: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const b = parsed.data;
    const lines = [
      b.notes.trim(),
      b.budgetRange ? `Budget: ${b.budgetRange}` : null,
      b.timeline ? `Timeline: ${b.timeline}` : null,
    ].filter(Boolean);

    const enrichment = mergeEnrichment(
      {},
      {
        service_types: ["software"],
        initial_notes: lines.join("\n\n"),
        quote_budget_range: b.budgetRange ?? null,
        quote_timeline: b.timeline ?? null,
      }
    );

    const insert: TablesInsert<"leads"> = {
      company_name: b.companyName,
      contact_name: null,
      email: b.email,
      phone: null,
      whatsapp: null,
      website: null,
      industry: null,
      service_type: "software",
      lead_score: 0,
      status: "new",
      source: "quote_request",
      enrichment_data: enrichment,
      ai_notes: lines.join("\n\n"),
    };

    await createLead(insert);
    return NextResponse.json({ ok: true as const });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server error";
    const status = msg.includes("is not set") ? 503 : 500;
    return NextResponse.json({ ok: false as const, error: msg }, { status });
  }
}
