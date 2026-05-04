import type { Lead } from "@/types";

import { compactJsonForAi, runClaudeJsonTask } from "./claude";
import { parseJsonObject } from "./parse-json";
import { emailDraftOutputSchema } from "./schemas";
import type { EmailDraft } from "./types";

const TASK_PROMPT = `You are writing cold outreach emails for Pjozz Technologies. Tone: confident, direct, human — NOT salesy or corporate. South African business context. Short emails win.

Rules:
- Initial email: max 120 words. Subject line curiosity-driven. One clear CTA.
- Follow-up 1 (day 3): different angle, reference the first email briefly.
- Follow-up 2 (day 7): add social proof or case study angle.
- Break-up (day 14): pattern interrupt, permission to close the loop.
- Always personalise using company name, industry, specific pain point.
- CTA is always booking a 20-min call via Calendly. Use the literal placeholder token {CALENDLY_LINK} in the body (do not invent a URL).

Return JSON only: { "subject": string, "body": string, "previewText": string }
previewText should be a short preheader (max ~90 chars) suitable for inbox previews.`;

export type OutreachEmailType = "initial" | "followup1" | "followup2" | "breakup";

export async function generateOutreachEmail(
  lead: Lead,
  emailType: OutreachEmailType,
  previousContext?: string
): Promise<EmailDraft> {
  const { text } = await runClaudeJsonTask({
    context: "generate-email",
    taskSystemPrompt: TASK_PROMPT,
    userPayload: compactJsonForAi({
      emailType,
      previousContext: previousContext ?? null,
      lead: {
        companyName: lead.companyName,
        contactName: lead.contactName,
        email: lead.email,
        phone: lead.phone,
        industry: lead.industry,
        serviceType: lead.serviceType,
        website: lead.website,
        leadScore: lead.leadScore,
        status: lead.status,
      },
    }),
    maxTokens: 1536,
  });
  const parsed = emailDraftOutputSchema.safeParse(parseJsonObject(text));
  if (!parsed.success) {
    throw new Error(`Invalid email draft JSON: ${parsed.error.message}`);
  }
  return parsed.data;
}
