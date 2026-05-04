import { createHmac, timingSafeEqual } from "crypto";

export type EmailTrackingPayload = {
  enrollmentId: string;
  campaignId: string;
  leadId: string;
  kind: "open" | "unsub";
};

function secret(): string {
  return (
    process.env.EMAIL_TRACKING_SECRET ||
    process.env.RESEND_WEBHOOK_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    "dev-insecure-tracking-secret"
  );
}

export function signEmailTrackingToken(payload: EmailTrackingPayload): string {
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const sig = createHmac("sha256", secret()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verifyEmailTrackingToken(token: string): EmailTrackingPayload | null {
  const i = token.lastIndexOf(".");
  if (i <= 0) return null;
  const body = token.slice(0, i);
  const sig = token.slice(i + 1);
  try {
    const expected = createHmac("sha256", secret()).update(body).digest("base64url");
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    const parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as EmailTrackingPayload;
    if (!parsed.enrollmentId || !parsed.campaignId || !parsed.leadId) return null;
    if (parsed.kind !== "open" && parsed.kind !== "unsub") return null;
    return parsed;
  } catch {
    return null;
  }
}
