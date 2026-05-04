import { NextResponse } from "next/server";
import { z } from "zod";

import {
  checkN8nHealth,
  checkResendHealth,
  checkSupabaseHealth,
  checkTwilioHealth,
  pingAnthropicApi,
} from "@/lib/integrations/health-checks";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  target: z.enum(["n8n", "resend", "anthropic", "supabase", "twilio"]),
});

export async function POST(req: Request) {
  try {
    let json: unknown;
    try {
      json = await req.json();
    } catch {
      return NextResponse.json({ ok: false as const, error: "Invalid JSON" }, { status: 400 });
    }
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false as const, error: "Invalid body", issues: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { target } = parsed.data;
    const testedAt = new Date().toISOString();

    let result: Awaited<ReturnType<typeof checkN8nHealth>>;
    if (target === "n8n") result = await checkN8nHealth();
    else if (target === "resend") result = await checkResendHealth();
    else if (target === "anthropic") result = await pingAnthropicApi();
    else if (target === "twilio") result = await checkTwilioHealth();
    else result = await checkSupabaseHealth();

    return NextResponse.json({
      ok: true as const,
      data: { target, testedAt, result },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ ok: false as const, error: msg }, { status: 500 });
  }
}
