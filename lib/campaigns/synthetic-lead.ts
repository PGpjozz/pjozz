import type { LeadApi } from "@/lib/leads/mappers";
import type { LeadServiceType } from "@/types";

/** Minimal lead payload for `/api/ai/generate-email` (Zod `apiLeadSchema`). */
export function buildSyntheticLeadForAi(serviceType: LeadServiceType, companyHint: string): LeadApi {
  const now = new Date().toISOString();
  return {
    id: "00000000-0000-4000-8000-000000000001",
    companyName: companyHint || "Example Company",
    contactName: "Decision maker",
    email: "prospect@example.com",
    phone: null,
    whatsapp: null,
    website: null,
    industry: "SMB",
    serviceType,
    leadScore: 55,
    status: "new",
    source: "campaign_wizard",
    enrichmentData: {},
    aiNotes: null,
    createdAt: now,
    updatedAt: now,
    lastActivityAt: now,
  };
}
