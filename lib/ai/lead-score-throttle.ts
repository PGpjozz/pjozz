import { createHash } from "crypto";

import type { Json } from "@/lib/db/database.types";

import { leadAnalysisOutputSchema } from "./schemas";
import type { LeadAnalysis, RawLeadData } from "./types";

type AiScoringMeta = { at: string; fingerprint: string };

function normalizeLeadPayload(data: RawLeadData): Record<string, unknown> {
  const signals = [...(data.signals ?? [])].map((s) => s.trim()).filter(Boolean).sort();
  return {
    companyName: (data.companyName ?? "").trim().toLowerCase(),
    contactName: (data.contactName ?? "").trim().toLowerCase(),
    email: (data.email ?? "").trim().toLowerCase(),
    phone: (data.phone ?? "").trim(),
    whatsapp: (data.whatsapp ?? "").trim(),
    website: (data.website ?? "").trim().toLowerCase(),
    industry: (data.industry ?? "").trim().toLowerCase(),
    serviceInterest: (data.serviceInterest ?? "").trim().toLowerCase(),
    notes: (data.notes ?? "").trim(),
    location: (data.location ?? "").trim().toLowerCase(),
    signals,
  };
}

/** Stable hash of fields that affect scoring — used to skip redundant Claude calls. */
export function fingerprintRawLeadData(data: RawLeadData): string {
  const canonical = JSON.stringify(normalizeLeadPayload(data));
  return createHash("sha256").update(canonical).digest("hex");
}

/** Minutes; unset → 120. Set `0` to disable reuse (always call Claude when scoring). */
export function leadScoreCacheTtlMs(): number {
  const raw = process.env.AI_LEAD_SCORE_CACHE_TTL_MINUTES;
  if (raw?.trim() === "0") return 0;
  const mins = raw?.trim() ? Number.parseInt(raw, 10) : 120;
  if (!Number.isFinite(mins) || mins <= 0) return 0;
  return mins * 60_000;
}

function parseAiScoringMeta(enrichment: Json): AiScoringMeta | null {
  if (!enrichment || typeof enrichment !== "object" || Array.isArray(enrichment)) return null;
  const o = enrichment as Record<string, unknown>;
  const ai = o.ai_scoring;
  if (!ai || typeof ai !== "object" || Array.isArray(ai)) return null;
  const at = (ai as AiScoringMeta).at;
  const fingerprint = (ai as AiScoringMeta).fingerprint;
  if (typeof at !== "string" || typeof fingerprint !== "string") return null;
  return { at, fingerprint };
}

function parseLastAiAnalysis(enrichment: Json): LeadAnalysis | null {
  if (!enrichment || typeof enrichment !== "object" || Array.isArray(enrichment)) return null;
  const o = enrichment as Record<string, unknown>;
  const raw = o.last_ai_analysis;
  const parsed = leadAnalysisOutputSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

/**
 * When inputs match the last scored fingerprint and TTL has not expired, return cached analysis (no API call).
 */
export function reuseCachedLeadScore(
  enrichment: Json,
  leadData: RawLeadData
): LeadAnalysis | null {
  const ttl = leadScoreCacheTtlMs();
  if (ttl <= 0) return null;

  const meta = parseAiScoringMeta(enrichment);
  const analysis = parseLastAiAnalysis(enrichment);
  if (!meta || !analysis) return null;

  if (fingerprintRawLeadData(leadData) !== meta.fingerprint) return null;
  if (Date.now() - new Date(meta.at).getTime() >= ttl) return null;

  return analysis;
}
