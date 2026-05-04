import { NextResponse } from "next/server";

import {
  anthropicEnvSnapshot,
  checkN8nHealth,
  checkResendHealth,
  checkSupabaseHealth,
  checkTwilioHealth,
  integrationEnvChecklist,
} from "@/lib/integrations/health-checks";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [n8n, resend, supabase, twilio] = await Promise.all([
      checkN8nHealth(),
      checkResendHealth(),
      checkSupabaseHealth(),
      checkTwilioHealth(),
    ]);
    const anthropic = anthropicEnvSnapshot();
    const env = integrationEnvChecklist();

    return NextResponse.json({
      ok: true as const,
      data: {
        n8n,
        resend,
        anthropic,
        supabase,
        twilio,
        env,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ ok: false as const, error: msg }, { status: 500 });
  }
}
