import { NextResponse } from "next/server";

import { generateOutreachEmail } from "@/lib/ai/email-writer";
import { generateEmailBodySchema, toAppLead } from "@/lib/ai/schemas";
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
    const parsed = generateEmailBodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false as const, error: "Invalid request body", issues: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const { lead, emailType, previousContext } = parsed.data;
    const draft = await generateOutreachEmail(toAppLead(lead), emailType, previousContext);
    return NextResponse.json({ ok: true as const, data: draft });
  } catch (e) {
    return aiErrorResponse("generate-email", e);
  }
}
