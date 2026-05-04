import { compactJsonForAi, runClaudeJsonTask } from "./claude";
import { parseJsonObject } from "./parse-json";
import type { LeadAnalysis, RawLeadData } from "./types";
import { leadAnalysisOutputSchema } from "./schemas";

const TASK_PROMPT = `You are the lead qualification AI for Pjozz Technologies, a South African tech company. Evaluate leads and score them 0-100.

Score based on:
- Company has a website that looks outdated or unresponsive (high priority for webapp/mobile)
- Business type likely needs security cams or network (construction, retail, warehouses, offices)
- Signs of growth (hiring, new location, expanding)
- Decision maker reachable (has email/phone)
- Located in South Africa (bonus points for Joburg, Pretoria, Cape Town, Durban)
- Industry: prioritize retail, hospitality, construction, logistics, professional services

Return a single JSON object with exactly these keys:
{ "score": number, "serviceMatch": string[], "reasoning": string, "suggestedApproach": string, "redFlags": string[] }

Rules:
- score must be an integer 0-100.
- serviceMatch: short snake_case or kebab labels matching Pjozz offers (e.g. "webapp", "security_cam", "network").
- redFlags: empty array if none.`;

export async function scoreAndAnalyzeLead(leadData: RawLeadData): Promise<LeadAnalysis> {
  const { text } = await runClaudeJsonTask({
    context: "score-lead",
    taskSystemPrompt: TASK_PROMPT,
    userPayload: `Lead data (JSON):\n${compactJsonForAi(leadData)}`,
    maxTokens: 2048,
  });
  const parsed = leadAnalysisOutputSchema.safeParse(parseJsonObject(text));
  if (!parsed.success) {
    throw new Error(`Invalid lead analysis JSON: ${parsed.error.message}`);
  }
  return parsed.data;
}
