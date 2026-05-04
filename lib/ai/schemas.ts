import { z } from "zod";

import type { Lead, LeadServiceType, LeadStatus } from "@/types";

const leadServiceType = z.enum([
  "webapp",
  "mobileapp",
  "automation",
  "network",
  "security_cam",
  "software",
]) satisfies z.ZodType<LeadServiceType>;

const leadStatus = z.enum([
  "new",
  "contacted",
  "qualified",
  "meeting",
  "proposal",
  "won",
  "lost",
]) satisfies z.ZodType<LeadStatus>;

export const apiLeadSchema = z.object({
  id: z.string().uuid(),
  companyName: z.string().min(1),
  contactName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().nullable(),
  whatsapp: z.string().nullable(),
  website: z.string().nullable(),
  industry: z.string().nullable(),
  serviceType: leadServiceType,
  leadScore: z.number().int().min(0).max(100),
  status: leadStatus,
  source: z.string().nullable(),
  enrichmentData: z.unknown().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const rawLeadDataSchema = z.object({
  companyName: z.string().optional(),
  contactName: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
  website: z.string().optional(),
  industry: z.string().optional(),
  serviceInterest: z.string().optional(),
  notes: z.string().optional(),
  location: z.string().optional(),
  signals: z.array(z.string()).optional(),
});

export const emailTypeSchema = z.enum(["initial", "followup1", "followup2", "breakup"]);

export const generateEmailBodySchema = z.object({
  lead: apiLeadSchema,
  emailType: emailTypeSchema,
  previousContext: z.string().max(8000).optional(),
});

export const generateProposalBodySchema = z.object({
  lead: apiLeadSchema,
  discoveryNotes: z.string().min(1).max(20000),
  serviceType: z.string().min(1).max(120),
  budgetRange: z.string().max(120).optional(),
  timelinePreference: z.string().max(120).optional(),
  specialRequirements: z.string().max(8000).optional(),
  /** Injected server-side from pricing templates when omitted */
  pricingReference: z.string().max(8000).optional(),
});

export const chatMessageSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(32000),
      })
    )
    .min(1)
    .max(40),
  /** Optional CRM snapshot JSON for dashboard copilot */
  contextBlock: z.string().max(24000).optional(),
});

export const leadAnalysisOutputSchema = z.object({
  score: z.number().min(0).max(100),
  serviceMatch: z.array(z.string()),
  reasoning: z.string(),
  suggestedApproach: z.string(),
  redFlags: z.array(z.string()),
});

export const emailDraftOutputSchema = z.object({
  subject: z.string(),
  body: z.string(),
  previewText: z.string(),
});

export const proposalContentOutputSchema = z.object({
  title: z.string(),
  executiveSummary: z.string(),
  problemStatement: z.string(),
  proposedSolution: z.string(),
  deliverables: z.array(
    z.object({
      item: z.string(),
      description: z.string(),
      included: z.boolean(),
    })
  ),
  timeline: z.array(
    z.object({
      phase: z.string(),
      duration: z.string(),
      description: z.string(),
    })
  ),
  investmentOptions: z.array(
    z.object({
      tier: z.string(),
      price: z.number(),
      description: z.string(),
      features: z.array(z.string()),
    })
  ),
  whyPjozz: z.string(),
  nextSteps: z.string(),
});

const insightTypeSchema = z.enum([
  "lead_score",
  "follow_up",
  "risk",
  "opportunity",
  "proposal",
  "general",
]);

const insightPrioritySchema = z.enum(["low", "medium", "high", "critical"]);

export const dailyBriefOutputSchema = z.object({
  summary: z.string(),
  alerts: z.array(
    z.object({
      type: insightTypeSchema,
      message: z.string(),
      priority: insightPrioritySchema,
      actionRequired: z.boolean(),
      relatedId: z.string().uuid().nullable().optional(),
    })
  ),
  topActions: z.array(z.string()).min(1).max(5),
  forecastNote: z.string(),
});

export function toAppLead(p: z.infer<typeof apiLeadSchema>): Lead {
  return {
    id: p.id,
    companyName: p.companyName,
    contactName: p.contactName,
    email: p.email,
    phone: p.phone,
    whatsapp: p.whatsapp,
    website: p.website,
    industry: p.industry,
    serviceType: p.serviceType,
    leadScore: p.leadScore,
    status: p.status,
    source: p.source,
    enrichmentData: (p.enrichmentData ?? null) as Lead["enrichmentData"],
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}
