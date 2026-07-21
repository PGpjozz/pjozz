import { NextResponse } from "next/server";
import { z } from "zod";

import type { Json, TablesInsert } from "@/lib/db/database.types";
import { createLead, createServerSupabaseClient } from "@/lib/db/supabase";
import { assertAutomationInbound } from "@/lib/automation/auth";
import { mergeEnrichment } from "@/lib/leads/mappers";
import { discoverEmailsFromWebsite, isDiscoveryConfigured, normalizeHostname, searchGoogleForLeadsPaged } from "@/lib/leads/web-discovery";
import { STARTUP_SMB_PRESETS, expandPresetQueries } from "@/lib/leads/discovery-presets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  /** Use a curated preset label; omit to run all presets. */
  presetLabel: z.string().min(1).optional(),
  /** Override query directly (skips presets). */
  query: z.string().min(2).max(500).optional(),
  /** Expand presets into city/industry variants for more coverage. */
  expand: z.boolean().default(true),
  /** Cap preset expansion so you don't burn through quotas. */
  maxPresetVariants: z.number().int().min(1).max(50).default(15),
  /** Primary service type for created leads (defaults to first in serviceTypes). */
  serviceTypes: z
    .array(z.enum(["webapp", "mobileapp", "automation", "network", "security_cam", "software"]))
    .min(1)
    .default(["webapp"]),
  /** Total Google CSE results per query (paginated). Note: Google may cap totals. */
  totalMaxResults: z.number().int().min(1).max(100).default(30),
  /** Page size per Google request (<=10). */
  pageSize: z.number().int().min(1).max(10).default(10),
  /** Max pages per query (<=10). */
  maxPages: z.number().int().min(1).max(10).default(5),
  /** Throttle between Google requests. */
  throttleMs: z.number().int().min(0).max(3000).default(250),
  /** How many candidates to attempt importing after enrichment. */
  maxImports: z.number().int().min(1).max(25).default(10),
  /** Max unique domains to import per query label. */
  maxPerQueryDomain: z.number().int().min(1).max(25).default(10),
  /** When true, does not write to DB. */
  dryRun: z.boolean().optional().default(false),
});

function safeWebsiteUrl(raw: string | null | undefined): string | null {
  const t = raw?.trim();
  if (!t) return null;
  try {
    return new URL(t.startsWith("http") ? t : `https://${t}`).href;
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  try {
    assertAutomationInbound(req);
    if (!isDiscoveryConfigured()) {
      return NextResponse.json(
        {
          ok: false as const,
          error: "Web discovery not configured. Set GOOGLE_CSE_API_KEY and GOOGLE_CSE_CX.",
        },
        { status: 503 }
      );
    }

    const json: unknown = await req.json().catch(() => ({}));
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false as const, error: "Invalid body", issues: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const p = parsed.data;
    const queries: Array<{ label: string; query: string; hint?: string }> = [];
    if (p.query?.trim()) {
      queries.push({ label: "custom", query: p.query.trim() });
    } else if (p.presetLabel?.trim()) {
      const preset = STARTUP_SMB_PRESETS.find((x) => x.label === p.presetLabel);
      if (!preset) {
        return NextResponse.json({ ok: false as const, error: "Unknown presetLabel" }, { status: 400 });
      }
      const expanded = p.expand ? expandPresetQueries(preset) : [{ label: preset.label, query: preset.query, hint: preset.hint }];
      queries.push(...expanded.slice(0, p.maxPresetVariants));
    } else {
      for (const preset of STARTUP_SMB_PRESETS) {
        const expanded = p.expand ? expandPresetQueries(preset) : [{ label: preset.label, query: preset.query, hint: preset.hint }];
        queries.push(...expanded.slice(0, p.maxPresetVariants));
      }
    }

    const supabase = createServerSupabaseClient();
    const createdIds: string[] = [];
    const skipped: Array<{ website?: string; reason: string }> = [];
    const attempted: Array<{ queryLabel: string; websiteUrl: string; chosenEmail: string | null; emailsFound: number }> = [];
    const startedAt = new Date().toISOString();
    const seenHosts = new Set<string>();
    const seenEmails = new Set<string>();

    for (const q of queries) {
      const candidates = await searchGoogleForLeadsPaged({
        query: q.query,
        totalMaxResults: p.totalMaxResults,
        pageSize: p.pageSize,
        maxPages: p.maxPages,
        throttleMs: p.throttleMs,
      });
      const domainsCreated = new Set<string>();
      for (const cand of candidates) {
        if (createdIds.length >= p.maxImports) break;

        const websiteUrl = safeWebsiteUrl(cand.websiteUrl);
        if (!websiteUrl) {
          skipped.push({ website: cand.websiteUrl, reason: "invalid_website_url" });
          continue;
        }

        const host = normalizeHostname(websiteUrl);
        if (host) {
          if (seenHosts.has(host)) {
            skipped.push({ website: websiteUrl, reason: "duplicate_host_in_run" });
            continue;
          }
          if (domainsCreated.size >= p.maxPerQueryDomain && !domainsCreated.has(host)) {
            skipped.push({ website: websiteUrl, reason: "max_per_query_domain_reached" });
            continue;
          }
          const { data: dupSite } = await supabase
            .from("leads")
            .select("id")
            .ilike("website", `%${host}%`)
            .limit(1)
            .maybeSingle();
          if (dupSite) {
            skipped.push({ website: websiteUrl, reason: "website_already_in_crm" });
            continue;
          }
        }

        const emailDiscovery = await discoverEmailsFromWebsite(websiteUrl);
        const email = emailDiscovery.chosen ?? cand.suggestedEmail;
        attempted.push({
          queryLabel: q.label,
          websiteUrl,
          chosenEmail: email,
          emailsFound: emailDiscovery.emails.length,
        });

        if (!email) {
          skipped.push({ website: websiteUrl, reason: "no_email_found" });
          continue;
        }

        const emailLower = email.trim().toLowerCase();
        if (seenEmails.has(emailLower)) {
          skipped.push({ website: websiteUrl, reason: "duplicate_email_in_run" });
          continue;
        }
        const { data: dupEmail } = await supabase.from("leads").select("id").ilike("email", emailLower).maybeSingle();
        if (dupEmail) {
          skipped.push({ website: websiteUrl, reason: "email_already_in_crm" });
          continue;
        }

        if (p.dryRun) continue;

        const primary = p.serviceTypes[0]!;
        const enrichment = mergeEnrichment(
          {},
          {
            service_types: p.serviceTypes,
            web_discovery: {
              query_label: q.label,
              query: q.query,
              hint: q.hint ?? null,
              snippet: cand.snippet ?? null,
              imported_at: new Date().toISOString(),
              website_scan: {
                scanned_urls: emailDiscovery.scannedUrls,
                emails_found: emailDiscovery.emails,
                chosen_email: emailDiscovery.chosen,
              },
            },
          }
        );

        const insert: TablesInsert<"leads"> = {
          company_name: cand.companyName.trim(),
          contact_name: null,
          email: emailLower,
          phone: null,
          whatsapp: null,
          website: websiteUrl,
          industry: null,
          service_type: primary,
          lead_score: 0,
          status: "new",
          source: "web_discovery_auto",
          enrichment_data: enrichment,
          ai_notes: cand.snippet ? `Discovery snippet:\n${cand.snippet.slice(0, 2000)}` : null,
        };

        const row = await createLead(insert);
        createdIds.push(row.id);
        if (host) {
          domainsCreated.add(host);
          seenHosts.add(host);
        }
        seenEmails.add(emailLower);
      }
    }

    if (!p.dryRun) {
      const { error: logErr } = await supabase.from("discovery_runs").insert({
        source: "web_discovery_auto",
        query_label: p.presetLabel ?? (p.query ? "custom" : "all_presets"),
        query: p.query ?? null,
        max_results: p.totalMaxResults,
        max_imports: p.maxImports,
        attempted_count: attempted.length,
        created_count: createdIds.length,
        skipped_count: skipped.length,
        created_ids: createdIds as unknown as Json,
        skipped: skipped as unknown as Json,
        meta: {
          startedAt,
          queries: queries.map((x) => x.label),
          totalMaxResults: p.totalMaxResults,
          pageSize: p.pageSize,
          maxPages: p.maxPages,
          throttleMs: p.throttleMs,
          maxPerQueryDomain: p.maxPerQueryDomain,
        } as unknown as Json,
        created_at: startedAt,
      });
      if (logErr) {
        console.error("[automation/discovery] failed to persist discovery_runs:", logErr.message);
      }
    }

    return NextResponse.json({
      ok: true as const,
      data: {
        dryRun: p.dryRun,
        queries: queries.map((x) => x.label),
        attempted,
        createdCount: createdIds.length,
        createdIds,
        skipped,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Discovery run failed";
    const status = msg === "Unauthorized" ? 401 : msg.includes("is not set") ? 503 : 500;
    return NextResponse.json({ ok: false as const, error: msg }, { status });
  }
}

