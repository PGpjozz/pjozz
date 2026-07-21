import { NextResponse } from "next/server";

import { generateProposal } from "@/lib/ai/proposal-generator";
import { generateProposalBodySchema, toAppLead } from "@/lib/ai/schemas";
import { getSetting } from "@/lib/settings/store";

import { aiErrorResponse } from "../_utils";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const flags = await getSetting("features.flags");
    if (flags.enableAi === false) {
      return NextResponse.json({ ok: false as const, error: "AI is disabled in settings." }, { status: 503 });
    }

    const json: unknown = await req.json();
    const parsed = generateProposalBodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false as const, error: "Invalid request body", issues: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const { lead, discoveryNotes, serviceType, budgetRange, timelinePreference, specialRequirements, pricingReference } =
      parsed.data;
    const proposalDefaults = await getSetting("proposals.defaults");
    const content = await generateProposal(toAppLead(lead), discoveryNotes, serviceType, {
      budgetRange,
      timelinePreference,
      specialRequirements,
      pricingReference,
      currency: proposalDefaults.currency ?? "ZAR",
    });
    return NextResponse.json({ ok: true as const, data: content });
  } catch (e) {
    return aiErrorResponse("generate-proposal", e);
  }
}
