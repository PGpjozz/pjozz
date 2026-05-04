import type { Json } from "@/lib/db/database.types";
import type { Tables } from "@/lib/db/supabase";

export type LeadApi = {
  id: string;
  companyName: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  website: string | null;
  industry: string | null;
  serviceType: Tables<"leads">["service_type"];
  leadScore: number;
  status: Tables<"leads">["status"];
  source: string | null;
  enrichmentData: Json;
  aiNotes: string | null;
  createdAt: string;
  updatedAt: string;
  lastActivityAt: string;
};

export function mapLeadRow(row: Tables<"leads">, lastActivityAt?: string): LeadApi {
  return {
    id: row.id,
    companyName: row.company_name,
    contactName: row.contact_name,
    email: row.email,
    phone: row.phone,
    whatsapp: row.whatsapp,
    website: row.website,
    industry: row.industry,
    serviceType: row.service_type,
    leadScore: row.lead_score,
    status: row.status,
    source: row.source,
    enrichmentData: row.enrichment_data,
    aiNotes: row.ai_notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastActivityAt: lastActivityAt ?? row.updated_at,
  };
}

export function mergeEnrichment(existing: Json, patch: Record<string, unknown>): Json {
  const base =
    existing && typeof existing === "object" && !Array.isArray(existing)
      ? (existing as Record<string, unknown>)
      : {};
  return { ...base, ...patch } as Json;
}
