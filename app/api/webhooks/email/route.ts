import { NextResponse } from "next/server";

import { processResendEmailWebhook } from "@/lib/campaigns/process-webhook";

export const dynamic = "force-dynamic";

/** Resend → Webhooks → point URL here. Handles opens, clicks, bounces, complaints, inbound reply (email.received). */
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false as const, error: "Invalid JSON" }, { status: 400 });
  }

  const result = await processResendEmailWebhook(body as Parameters<typeof processResendEmailWebhook>[0]);
  if (!result.ok) {
    return NextResponse.json({ ok: false as const, error: result.error }, { status: 500 });
  }
  return NextResponse.json({ ok: true as const, handled: result.handled });
}
