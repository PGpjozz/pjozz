import { NextResponse } from "next/server";
import { z } from "zod";

import type { TablesInsert } from "@/lib/db/database.types";
import { createLead } from "@/lib/db/supabase";
import { notifyInboundLead } from "@/lib/forms/inbound-notify";
import { clientIpKey, isHoneypotTripped, isRateLimited } from "@/lib/forms/spam-guard";
import { mergeEnrichment } from "@/lib/leads/mappers";

export const dynamic = "force-dynamic";

const serviceTypes = z.enum(["webapp", "mobileapp", "automation", "network", "security_cam", "software"]);

const bodySchema = z.object({
  companyName: z.string().min(1).max(200),
  contactName: z.string().max(200).optional(),
  email: z.string().email(),
  phone: z.string().max(40).optional(),
  message: z.string().min(20).max(8000),
  serviceTypes: z.array(serviceTypes).min(1).max(6),
  consent: z.boolean().refine((v) => v === true, { message: "Privacy consent is required." }),
  /** Honeypot — must stay empty */
  website: z.string().max(200).optional(),
});

/** Public marketing contact — creates a CRM lead (same storage as operator inbound). */
export async function POST(req: Request) {
  try {
    const ip = clientIpKey(req);
    if (isRateLimited("contact", ip)) {
      return NextResponse.json(
        { ok: false as const, error: "Too many requests. Please try again in a few minutes." },
        { status: 429 }
      );
    }

    const json: unknown = await req.json();
    if (json && typeof json === "object" && isHoneypotTripped(json as Record<string, unknown>)) {
      // Pretend success so bots don't retry.
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
    const primary = b.serviceTypes[0]!;
    const enrichment = mergeEnrichment(
      {},
      {
        service_types: b.serviceTypes,
        initial_notes: b.message,
        source_detail: "website_contact_form",
      }
    );

    const insert: TablesInsert<"leads"> = {
      company_name: b.companyName,
      contact_name: b.contactName ?? null,
      email: b.email,
      phone: b.phone ?? null,
      whatsapp: null,
      website: null,
      industry: null,
      service_type: primary,
      lead_score: 0,
      status: "new",
      source: "website",
      enrichment_data: enrichment,
      ai_notes: b.message,
    };

    await createLead(insert);

    await notifyInboundLead({
      kind: "contact",
      companyName: b.companyName,
      email: b.email,
      contactName: b.contactName,
      phone: b.phone,
      summary: b.message,
      extraLines: [`Services: ${b.serviceTypes.join(", ")}`],
    });

    return NextResponse.json({ ok: true as const });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server error";
    const status = msg.includes("is not set") ? 503 : 500;
    return NextResponse.json({ ok: false as const, error: msg }, { status });
  }
}
