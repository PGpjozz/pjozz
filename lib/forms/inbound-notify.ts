import { sendTransactionalEmail } from "@/lib/email/resend";
import { SITE, siteEmail } from "@/lib/site-config";

function opsEmail(): string | null {
  return process.env.PJozZ_TEAM_EMAIL ?? process.env.OPS_NOTIFY_EMAIL ?? null;
}

/** Best-effort ops + auto-reply for public inbound forms. Never throws. */
export async function notifyInboundLead(opts: {
  kind: "contact" | "quote";
  companyName: string;
  email: string;
  contactName?: string | null;
  phone?: string | null;
  summary: string;
  extraLines?: string[];
}): Promise<void> {
  const notify = opsEmail();
  const subjectPrefix = opts.kind === "quote" ? "Quote request" : "Website enquiry";

  if (notify) {
    try {
      const rows = [
        `<p><strong>${subjectPrefix}</strong> from ${escapeHtml(opts.companyName)}</p>`,
        opts.contactName ? `<p>Contact: ${escapeHtml(opts.contactName)}</p>` : "",
        `<p>Email: <a href="mailto:${escapeHtml(opts.email)}">${escapeHtml(opts.email)}</a></p>`,
        opts.phone ? `<p>Phone: ${escapeHtml(opts.phone)}</p>` : "",
        ...(opts.extraLines ?? []).map((l) => `<p>${escapeHtml(l)}</p>`),
        `<pre style="white-space:pre-wrap;font-family:ui-monospace,monospace;font-size:13px;background:#f4f4f5;padding:12px;border-radius:8px">${escapeHtml(opts.summary)}</pre>`,
        `<p style="color:#666;font-size:12px">Lead is already in the CRM.</p>`,
      ]
        .filter(Boolean)
        .join("");

      await sendTransactionalEmail({
        to: notify,
        subject: `${subjectPrefix}: ${opts.companyName}`,
        html: rows,
      });
    } catch (e) {
      console.warn("[inbound-notify] ops email failed:", e);
    }
  }

  try {
    await sendTransactionalEmail({
      to: opts.email,
      subject: `We received your message — ${SITE.shortName}`,
      html: `
        <p>Hi ${escapeHtml(opts.contactName || "there")},</p>
        <p>Thanks for reaching out to ${SITE.name}. We've logged your ${
          opts.kind === "quote" ? "quote request" : "enquiry"
        } and a team member will respond shortly (usually within one business day).</p>
        <p>If it's urgent, reply to this email or WhatsApp us from <a href="${escapeHtml(
          process.env.NEXT_PUBLIC_APP_URL || "https://pjozz.co.za"
        )}/contact">our contact page</a>.</p>
        <p style="color:#666;font-size:12px">— ${SITE.name}<br/>${escapeHtml(siteEmail())}</p>
      `,
    });
  } catch (e) {
    console.warn("[inbound-notify] auto-reply failed:", e);
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
