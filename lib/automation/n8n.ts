/**
 * Outbound calls from Pjozz → self-hosted n8n (Webhook trigger nodes).
 * Base URL: `N8N_BASE_URL` (default http://localhost:5678).
 * Optional `N8N_WEBHOOK_CALL_SECRET` sent as `Authorization: Bearer …` if n8n expects it.
 */

const DEFAULT_N8N_BASE = "http://localhost:5678";

function n8nBaseUrl(): string {
  return (process.env.N8N_BASE_URL ?? DEFAULT_N8N_BASE).replace(/\/$/, "");
}

/**
 * Webhook path segments — create matching **Webhook** nodes in n8n (Production URL uses this ID).
 * Replace values here to match your n8n workflow webhook paths.
 */
export const N8N_WEBHOOK_IDS = {
  /** Optional: notify Slack / downstream after internal job */
  leadScraperComplete: "pjozz-lead-scraper-complete",
  /** Optional: tick after CRM batch job */
  crmBatchTick: "pjozz-crm-batch-tick",
  /** Optional: alert on campaign anomaly */
  campaignAlert: "pjozz-campaign-alert",
  /** Optional: mirror Calendly raw payload for debugging */
  calendlyMirror: "pjozz-calendly-mirror",
} as const;

export type N8nWebhookId = (typeof N8N_WEBHOOK_IDS)[keyof typeof N8N_WEBHOOK_IDS] | (string & {});

export type TriggerWebhookResult = {
  ok: boolean;
  status: number;
  bodySnippet: string;
};

/**
 * POST JSON to `N8N_BASE_URL/webhook/:webhookId`.
 */
export async function triggerWebhook(webhookId: string, data: object): Promise<TriggerWebhookResult> {
  const url = `${n8nBaseUrl()}/webhook/${encodeURIComponent(webhookId)}`;
  const secret = process.env.N8N_WEBHOOK_CALL_SECRET;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(secret ? { Authorization: `Bearer ${secret}` } : {}),
    },
    body: JSON.stringify(data),
  });
  const text = await res.text();
  return {
    ok: res.ok,
    status: res.status,
    bodySnippet: text.slice(0, 800),
  };
}
