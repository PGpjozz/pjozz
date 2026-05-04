import { Resend } from "resend";

import { signEmailTrackingToken } from "./tracking";

export type SendEmailParams = {
  to: string;
  subject: string;
  html: string;
  text?: string;
  fromName?: string;
  tags?: Record<string, string>;
  tracking?: {
    baseUrl: string;
    enrollmentId: string;
    campaignId: string;
    leadId: string;
  };
};

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not set`);
  return v;
}

const TRANSPARENT_GIF_PATH = "/api/track/email-open";

/**
 * Append open pixel + List-Unsubscribe style link (required for compliance).
 * Prefers injecting before `</body>`; otherwise appends to the end.
 */
export function injectEmailTracking(html: string, opts: { openPixelUrl: string; unsubscribeUrl: string }): string {
  const block = `
<div style="display:none;font-size:1px;color:#fff;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden">
  <img src="${opts.openPixelUrl}" width="1" height="1" alt="" />
</div>
<p style="font-size:11px;color:#888;margin-top:16px">
  <a href="${opts.unsubscribeUrl}" style="color:#888">Unsubscribe</a> from this campaign.
</p>`;
  if (html.includes("</body>")) {
    return html.replace("</body>", `${block}</body>`);
  }
  return `${html}${block}`;
}

function formatFrom(fromRaw: string, fromName?: string): string {
  const email = (() => {
    const m = fromRaw.match(/<([^>]+)>/);
    return (m ? m[1] : fromRaw).trim();
  })();
  if (fromName?.trim()) return `${fromName.trim()} <${email}>`;
  return fromRaw.includes("<") ? fromRaw : email;
}

export async function sendEmail(params: SendEmailParams): Promise<{ id: string }> {
  const apiKey = requireEnv("RESEND_API_KEY");
  const fromRaw = process.env.RESEND_FROM_EMAIL ?? process.env.EMAIL_FROM;
  if (!fromRaw) throw new Error("RESEND_FROM_EMAIL or EMAIL_FROM is not set");
  const from = formatFrom(fromRaw, params.fromName);

  let html = params.html;
  if (params.tracking) {
    const { baseUrl, enrollmentId, campaignId, leadId } = params.tracking;
    const root = baseUrl.replace(/\/$/, "");
    const openTok = signEmailTrackingToken({
      enrollmentId,
      campaignId,
      leadId,
      kind: "open",
    });
    const unsubTok = signEmailTrackingToken({
      enrollmentId,
      campaignId,
      leadId,
      kind: "unsub",
    });
    const openPixelUrl = `${root}${TRANSPARENT_GIF_PATH}?t=${encodeURIComponent(openTok)}`;
    const unsubscribeUrl = `${root}/api/track/unsubscribe?t=${encodeURIComponent(unsubTok)}`;
    html = injectEmailTracking(html, { openPixelUrl, unsubscribeUrl });
  }

  const resend = new Resend(apiKey);
  const tagList = params.tags
    ? Object.entries(params.tags).map(([name, value]) => ({
        name: name.slice(0, 256),
        value: value.slice(0, 256),
      }))
    : undefined;

  const { data, error } = await resend.emails.send({
    from,
    to: [params.to],
    subject: params.subject,
    html,
    text: params.text,
    tags: tagList,
  });

  if (error) throw new Error(typeof error === "object" && error && "message" in error ? String((error as { message: string }).message) : "Resend send failed");
  if (!data?.id) throw new Error("Resend returned no id");
  return { id: data.id };
}

/** One-off transactional send (e.g. lead detail) — no tracking pixel or unsubscribe block. */
export async function sendTransactionalEmail(opts: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<{ id: string }> {
  return sendEmail({
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
    text: opts.text,
  });
}
