/**
 * Shared auth for automation callers (n8n, cron, internal scripts).
 * Set `N8N_INBOUND_SECRET` (preferred) or reuse `OUTREACH_CRON_SECRET`.
 *
 * - Production / Vercel: secret is required; missing secret → Unauthorized.
 * - Local development: when neither is set, requests are allowed (dev convenience).
 */
export function assertAutomationInbound(req: Request): void {
  const secret = process.env.N8N_INBOUND_SECRET ?? process.env.OUTREACH_CRON_SECRET;
  const isProd = process.env.NODE_ENV === "production" || Boolean(process.env.VERCEL);

  if (!secret) {
    if (isProd) {
      throw new Error("Unauthorized");
    }
    return;
  }

  const auth = req.headers.get("authorization");
  const bearer = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  const header = req.headers.get("x-pjozz-automation-secret");
  const token = bearer ?? header;
  if (token !== secret) {
    throw new Error("Unauthorized");
  }
}
