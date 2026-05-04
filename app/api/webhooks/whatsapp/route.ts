import { NextResponse } from "next/server";

import { handleInboundWhatsAppReply } from "@/lib/whatsapp/inbound";
import { twilioWebhookPublicUrl, validateTwilioWebhookSignature } from "@/lib/whatsapp/twilio";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function formDataToRecord(req: Request): Promise<Record<string, string>> {
  const fd = await req.formData();
  const out: Record<string, string> = {};
  for (const [k, v] of Array.from(fd.entries())) {
    if (typeof v === "string") out[k] = v;
  }
  return out;
}

/** Twilio console “ping” / health check. */
export async function GET() {
  return new NextResponse("Pjozz WhatsApp webhook — POST inbound messages from Twilio here.", {
    status: 200,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

/**
 * Twilio WhatsApp inbound (sandbox or production).
 * Configure in Twilio: Messaging → WhatsApp sender → webhook URL = this route’s public URL.
 */
export async function POST(req: Request) {
  try {
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const signature = req.headers.get("X-Twilio-Signature");
    const params = await formDataToRecord(req);

    const validate = process.env.TWILIO_VALIDATE_WEBHOOK === "1";
    if (validate && authToken) {
      let fullUrl: string;
      try {
        fullUrl = twilioWebhookPublicUrl();
      } catch {
        return NextResponse.json({ ok: false as const, error: "TWILIO_WEBHOOK_PUBLIC_URL or NEXT_PUBLIC_APP_URL required" }, { status: 503 });
      }
      if (!validateTwilioWebhookSignature(authToken, signature, fullUrl, params)) {
        return NextResponse.json({ ok: false as const, error: "Invalid signature" }, { status: 403 });
      }
    }

    const from = params.From ?? "";
    const to = params.To ?? "";
    const body = params.Body ?? "";
    const messageSid = params.MessageSid ?? params.SmsSid ?? "";

    if (!from) {
      return new NextResponse("", { status: 200 });
    }

    await handleInboundWhatsAppReply({ messageSid, from, to, body });

    return new NextResponse("", { status: 200 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server error";
    console.error("[whatsapp webhook]", msg);
    return NextResponse.json({ ok: false as const, error: msg }, { status: 500 });
  }
}
