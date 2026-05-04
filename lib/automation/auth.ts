/**
 * Shared auth for automation callers (n8n, cron, internal scripts).
 * Set `N8N_INBOUND_SECRET` (preferred) or reuse `OUTREACH_CRON_SECRET`.
 * When neither is set, routes accept unauthenticated requests (local dev only).
 */
export function assertAutomationInbound(req: Request): void {
  const secret = process.env.N8N_INBOUND_SECRET ?? process.env.OUTREACH_CRON_SECRET;
  if (!secret) return;
  const auth = req.headers.get("authorization");
  const bearer = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  const header = req.headers.get("x-pjozz-automation-secret");
  const token = bearer ?? header;
  if (token !== secret) {
    throw new Error("Unauthorized");
  }
}
