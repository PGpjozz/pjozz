import { NextResponse } from "next/server";
import { z } from "zod";

import type { TablesInsert } from "@/lib/db/database.types";
import { createLead, createServerSupabaseClient } from "@/lib/db/supabase";
import { mergeEnrichment } from "@/lib/leads/mappers";
import { searchGoogleForLeads, isDiscoveryConfigured, normalizeHostname } from "@/lib/leads/web-discovery";

export const dynamic = "force-dynamic";

function safeWebsiteUrl(raw: string | null | undefined): string | null {
  const t = raw?.trim();
  if (!t) return null;
  try {
    return new URL(t.startsWith("http") ? t : `https://${t}`).href;
  } catch {
    return null;
  }
}

const searchSchema = z.object({
  mode: z.literal("search"),
  query: z.string().min(2).max(500),
  maxResults: z.coerce.number().int().min(1).max(10).optional().default(10),
});

const importItemSchema = z.object({
  companyName: z.string().min(1).max(300),
  email: z.string().email(),
  website: z.string().max(2048).optional().nullable(),
  industry: z.string().max(200).optional().nullable(),
  snippet: z.string().max(2000).optional().nullable(),
});

const importSchema = z.object({
  mode: z.literal("import"),
  serviceTypes: z
    .array(
      z.enum(["webapp", "mobileapp", "automation", "network", "security_cam", "software"])
    )
    .min(1),
  items: z.array(importItemSchema).min(1).max(25),
});

const bodySchema = z.discriminatedUnion("mode", [searchSchema, importSchema]);

export async function POST(req: Request) {
  try {
    if (!isDiscoveryConfigured()) {
      return NextResponse.json(
        {
          ok: false as const,
          error:
            "Web discovery is not configured. Add GOOGLE_CSE_API_KEY and GOOGLE_CSE_CX to .env.local (see Google Programmable Search Engine).",
        },
        { status: 503 }
      );
    }

    let json: unknown;
    try {
      json = await req.json();
    } catch {
      return NextResponse.json({ ok: false as const, error: "Expected JSON body" }, { status: 400 });
    }

    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false as const, error: "Invalid body", issues: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const body = parsed.data;
    if (body.mode === "search") {
      const candidates = await searchGoogleForLeads(body.query, body.maxResults);
      return NextResponse.json({ ok: true as const, data: { candidates } });
    }

    const supabase = createServerSupabaseClient();
    const created: string[] = [];
    const skipped: { email?: string; website?: string; reason: string }[] = [];

    for (const item of body.items) {
      const normalizedSite = safeWebsiteUrl(item.website);
      const host = normalizedSite ? normalizeHostname(normalizedSite) : null;
      if (host) {
        const { data: dupSite } = await supabase
          .from("leads")
          .select("id")
          .ilike("website", `%${host}%`)
          .limit(1)
          .maybeSingle();
        if (dupSite) {
          skipped.push({ website: item.website ?? undefined, reason: "website_already_in_crm" });
          continue;
        }
      }

      const emailLower = item.email.trim().toLowerCase();
      const { data: dupEmail } = await supabase
        .from("leads")
        .select("id")
        .ilike("email", emailLower)
        .limit(1)
        .maybeSingle();
      if (dupEmail) {
        skipped.push({ email: emailLower, reason: "email_already_in_crm" });
        continue;
      }

      const primary = body.serviceTypes[0]!;
      const enrichment = mergeEnrichment(
        {},
        {
          service_types: body.serviceTypes,
          web_discovery: {
            snippet: item.snippet ?? null,
            imported_at: new Date().toISOString(),
          },
        }
      );

      const insert: TablesInsert<"leads"> = {
        company_name: item.companyName.trim(),
        contact_name: null,
        email: emailLower,
        phone: null,
        whatsapp: null,
        website: normalizedSite,
        industry: item.industry?.trim() || null,
        service_type: primary,
        lead_score: 0,
        status: "new",
        source: "web_discovery",
        enrichment_data: enrichment,
        ai_notes: item.snippet ? `Discovery snippet:\n${item.snippet.slice(0, 2000)}` : null,
      };

      const row = await createLead(insert);
      created.push(row.id);
    }

    return NextResponse.json({
      ok: true as const,
      data: { createdIds: created, createdCount: created.length, skipped },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Discovery failed";
    return NextResponse.json({ ok: false as const, error: msg }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true as const,
    data: { configured: isDiscoveryConfigured() },
  });
}
