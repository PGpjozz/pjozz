import { NextResponse } from "next/server";
import { z } from "zod";

import type { TablesInsert } from "@/lib/db/database.types";
import { createLead } from "@/lib/db/supabase";
import { notifyInboundLead } from "@/lib/forms/inbound-notify";
import { clientIpKey, isHoneypotTripped, isRateLimited } from "@/lib/forms/spam-guard";
import { mergeEnrichment } from "@/lib/leads/mappers";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  companyName: z.string().min(1).max(200),
  email: z.string().email(),
  budgetRange: z.string().max(120).optional(),
  timeline: z.string().max(200).optional(),
  notes: z.string().min(15).max(8000),
  consent: z.boolean().refine((v) => v === true, { message: "Privacy consent is required." }),
  website: z.string().max(200).optional(),
});

/** Procurement quote capture → CRM lead (source: quote_request). */
export async function POST(req: Request) {
  try {
    const ip = clientIpKey(req);
    if (isRateLimited("quote", ip)) {
      return NextResponse.json(
        { ok: false as const, error: "Too many requests. Please try again in a few minutes." },
        { status: 429 }
      );
    }

    const json: unknown = await req.json();
    if (json && typeof json === "object" && isHoneypotTripped(json as Record<string, unknown>)) {
      return NextResponse.json({ ok: true as const });
    }

    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false as const, error: "Please check the form fields.", issues: parsed.error.flatten() },
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

    await notifyInboundLead({
      kind: "quote",
      companyName: b.companyName,
      email: b.email,
      summary: b.notes,
      extraLines: [
        b.budgetRange ? `Budget: ${b.budgetRange}` : null,
        b.timeline ? `Timeline: ${b.timeline}` : null,
      ].filter(Boolean) as string[],
    });

    return NextResponse.json({ ok: true as const });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server error";
    const status = msg.includes("is not set") ? 503 : 500;
    return NextResponse.json({ ok: false as const, error: msg }, { status });
  }
}
