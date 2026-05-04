import type { Lead } from "@/types";

import { compactJsonForAi, runClaudeJsonTask } from "./claude";
import { parseJsonObject } from "./parse-json";
import { proposalContentOutputSchema } from "./schemas";
import type { ProposalContent } from "./types";

const TASK_PROMPT = `You are generating professional service proposals for Pjozz Technologies. Currency is ZAR. Be specific, confident, and results-focused.

Use the provided lead profile, discovery notes, and primary service type. Investment tiers should be realistic for SME / mid-market South Africa unless notes say otherwise.

Return JSON only with this exact shape:
{
  "title": string,
  "executiveSummary": string,
  "problemStatement": string,
  "proposedSolution": string,
  "deliverables": Array<{ "item": string, "description": string, "included": boolean }>,
  "timeline": Array<{ "phase": string, "duration": string, "description": string }>,
  "investmentOptions": Array<{ "tier": string, "price": number, "description": string, "features": string[] }>,
  "whyPjozz": string,
  "nextSteps": string
}

Prices in investmentOptions.price are ZAR amounts as numbers (no symbols).`;

export type GenerateProposalExtras = {
  budgetRange?: string;
  timelinePreference?: string;
  specialRequirements?: string;
  pricingReference?: string;
};

export async function generateProposal(
  lead: Lead,
  discoveryNotes: string,
  serviceType: string,
  extras?: GenerateProposalExtras
): Promise<ProposalContent> {
  const { text } = await runClaudeJsonTask({
    context: "generate-proposal",
    taskSystemPrompt: TASK_PROMPT,
    userPayload: compactJsonForAi({
      serviceType,
      discoveryNotes,
      budgetRange: extras?.budgetRange ?? null,
      timelinePreference: extras?.timelinePreference ?? null,
      specialRequirements: extras?.specialRequirements ?? null,
      pricingReference: extras?.pricingReference ?? null,
      lead: {
        companyName: lead.companyName,
        contactName: lead.contactName,
        industry: lead.industry,
        website: lead.website,
        currentServiceInterest: lead.serviceType,
        leadScore: lead.leadScore,
      },
    }),
    maxTokens: 6144,
  });
  const parsed = proposalContentOutputSchema.safeParse(parseJsonObject(text));
  if (!parsed.success) {
    throw new Error(`Invalid proposal JSON: ${parsed.error.message}`);
  }
  return parsed.data;
}
