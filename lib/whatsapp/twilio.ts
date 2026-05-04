import crypto from "crypto";

function normalizeE164(inner: string): string {
  const n = inner.replace(/\s/g, "");
  if (!n) return "";
  if (n.startsWith("+")) return n;
  if (n.startsWith("0") && n.length >= 9) return `+27${n.slice(1)}`;
  if (/^\d+$/.test(n)) return `+${n}`;
  return n;
}

/** Twilio WhatsApp uses `whatsapp:+E164` addresses. */
export function formatWhatsAppAddress(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  const n = raw.replace(/\s/g, "");
  const inner = n.replace(/^whatsapp:/i, "");
  const e164 = normalizeE164(inner);
  if (!e164) return null;
  return `whatsapp:${e164}`;
}

function requireTwilioCreds(): { sid: string; token: string; from: string } {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_WHATSAPP_FROM;
  if (!sid || !token || !from) {
    throw new Error("TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_WHATSAPP_FROM must be set for WhatsApp");
  }
  const fromFmt = formatWhatsAppAddress(from);
  if (!fromFmt) throw new Error("TWILIO_WHATSAPP_FROM is invalid");
  return { sid, token, from: fromFmt };
}

export type SendWhatsAppResult = { sid: string; status: string | null };

/**
 * Send a WhatsApp text via Twilio Messages API (session messages; templates not implemented here).
 */
export async function sendWhatsAppMessage(opts: { to: string; body: string }): Promise<SendWhatsAppResult> {
  const { sid, token, from } = requireTwilioCreds();
  const to = formatWhatsAppAddress(opts.to);
  if (!to) throw new Error("Invalid WhatsApp recipient");

  const body = new URLSearchParams({
    From: from,
    To: to,
    Body: opts.body.slice(0, 1600),
  });

  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  const json = (await res.json()) as { sid?: string; status?: string; message?: string; code?: number };
  if (!res.ok) {
    throw new Error(json.message ?? `Twilio HTTP ${res.status}`);
  }
  if (!json.sid) throw new Error("Twilio returned no Message SID");
  return { sid: json.sid, status: json.status ?? null };
}

/** Strip HTML for WhatsApp plain-text bodies. */
export function stripHtmlForWhatsApp(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/**
 * Twilio webhook signature validation.
 * `fullUrl` must match the URL configured on the webhook in Twilio (including scheme/host/path).
 * Set `TWILIO_WEBHOOK_PUBLIC_URL` if the app is behind a proxy and `NEXT_PUBLIC_APP_URL` does not match.
 */
export function validateTwilioWebhookSignature(
  authToken: string,
  twilioSignature: string | null,
  fullUrl: string,
  params: Record<string, string>
): boolean {
  if (!twilioSignature) return false;
  const sortedKeys = Object.keys(params).sort();
  let data = fullUrl;
  for (const k of sortedKeys) {
    data += k + params[k];
  }
  const hmac = crypto.createHmac("sha1", authToken).update(data, "utf8").digest("base64");
  try {
    return crypto.timingSafeEqual(Buffer.from(twilioSignature), Buffer.from(hmac));
  } catch {
    return false;
  }
}

export function twilioWebhookPublicUrl(): string {
  const explicit = process.env.TWILIO_WEBHOOK_PUBLIC_URL?.replace(/\/$/, "");
  if (explicit) return explicit;
  const app = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (!app) throw new Error("Set TWILIO_WEBHOOK_PUBLIC_URL or NEXT_PUBLIC_APP_URL for webhook signature validation");
  return `${app}/api/webhooks/whatsapp`;
}
