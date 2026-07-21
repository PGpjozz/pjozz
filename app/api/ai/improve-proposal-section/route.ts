import { NextResponse } from "next/server";
import { z } from "zod";

import { compactJsonForAi, runClaudeJsonTask } from "@/lib/ai/claude";
import { parseJsonObject } from "@/lib/ai/parse-json";
import { proposalContentOutputSchema } from "@/lib/ai/schemas";
import { getSetting } from "@/lib/settings/store";

import { aiErrorResponse } from "../_utils";

export const dynamic = "force-dynamic";

const sectionKey = z.enum([
  "executiveSummary",
  "problemStatement",
  "proposedSolution",
  "whyPjozz",
  "nextSteps",
]);

const bodySchema = z.object({
  section: sectionKey,
  proposal: proposalContentOutputSchema,
  hint: z.string().max(2000).optional(),
});

const outSchema = z.object({ text: z.string().min(1) });

export async function POST(req: Request) {
  try {
    const flags = await getSetting("features.flags");
    if (flags.enableAi === false) {
      return NextResponse.json({ ok: false as const, error: "AI is disabled in settings." }, { status: 503 });
    }

    const json: unknown = await req.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false as const, error: "Invalid body", issues: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const { section, proposal, hint } = parsed.data;
    const current = proposal[section];

    const { text } = await runClaudeJsonTask({
      context: "improve-proposal-section",
      taskSystemPrompt: `Rewrite ONLY the "${section}" section of a Pjozz proposal. Keep ZAR context and professional tone. Do not change other sections.
Return JSON: { "text": string } — the full replacement for this section only.`,
      userPayload: compactJsonForAi({
        section,
        current,
        fullProposalSummary: {
          title: proposal.title,
          deliverablesCount: proposal.deliverables.length,
          tiers: proposal.investmentOptions.map((o) => o.tier),
        },
        operatorHint: hint ?? null,
      }),
      maxTokens: 2048,
    });
    const out = outSchema.safeParse(parseJsonObject(text));
    if (!out.success) throw new Error("Invalid AI response");
    return NextResponse.json({ ok: true as const, data: { text: out.data.text } });
  } catch (e) {
    return aiErrorResponse("improve-proposal-section", e);
  }
}
