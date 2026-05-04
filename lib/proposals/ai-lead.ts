import type { Tables } from "@/lib/db/supabase";
import { apiLeadSchema } from "@/lib/ai/schemas";
import type { z } from "zod";

/** Shape required by `apiLeadSchema` / `toAppLead` when calling proposal AI. */
export function leadRowToApiLeadForAi(row: Tables<"leads">): z.infer<typeof apiLeadSchema> {
  const serviceType = row.service_type ?? "webapp";
  return apiLeadSchema.parse({
    id: row.id,
    companyName: row.company_name,
    contactName: (row.contact_name?.trim() || "Decision maker").slice(0, 200),
    email: (row.email?.trim() || "prospect@example.com").toLowerCase(),
    phone: row.phone,
    whatsapp: row.whatsapp,
    website: row.website,
    industry: row.industry,
    serviceType,
    leadScore: row.lead_score,
    status: row.status,
    source: row.source,
    enrichmentData: row.enrichment_data,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}
