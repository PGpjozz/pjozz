import { getAnthropicClient } from "@/lib/ai/claude";
import { n8nBaseUrl } from "@/lib/automation/n8n";
import { createServerSupabaseClient } from "@/lib/db/supabase";

export type CheckResult = {
  ok: boolean;
  configured?: boolean;
  status?: number;
  latencyMs?: number;
  error?: string;
};

export async function checkN8nHealth(): Promise<CheckResult> {
  const base = n8nBaseUrl();
  const t0 = Date.now();
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(`${base}/healthz`, { signal: controller.signal, cache: "no-store" });
    clearTimeout(id);
    return { ok: res.ok, status: res.status, latencyMs: Date.now() - t0 };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Request failed" };
  }
}

export async function checkResendHealth(): Promise<CheckResult> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { ok: false, configured: false, error: "RESEND_API_KEY not set" };
  const t0 = Date.now();
  try {
    const res = await fetch("https://api.resend.com/domains", {
      headers: { Authorization: `Bearer ${key}` },
      cache: "no-store",
    });
    return { ok: res.ok, configured: true, status: res.status, latencyMs: Date.now() - t0 };
  } catch (e) {
    return { ok: false, configured: true, error: e instanceof Error ? e.message : "Request failed" };
  }
}

/** Env-only snapshot (no API spend). Use “Test connection” → `pingAnthropicApi`. */
export function anthropicEnvSnapshot(): { configured: boolean; liveOk: null } {
  return { configured: Boolean(process.env.ANTHROPIC_API_KEY), liveOk: null };
}

/** Minimal Claude call — only from explicit “Test connection”. */
export async function pingAnthropicApi(): Promise<CheckResult> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return { ok: false, configured: false, error: "ANTHROPIC_API_KEY not set" };
  try {
    const client = getAnthropicClient();
    await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 1,
      messages: [{ role: "user", content: "ping" }],
    });
    return { ok: true, configured: true };
  } catch (e) {
    return { ok: false, configured: true, error: e instanceof Error ? e.message : "API error" };
  }
}

export async function checkTwilioHealth(): Promise<CheckResult> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) {
    return { ok: false, configured: false, error: "TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN not set" };
  }
  const t0 = Date.now();
  try {
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}.json`, {
      headers: { Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}` },
      cache: "no-store",
    });
    return { ok: res.ok, configured: true, status: res.status, latencyMs: Date.now() - t0 };
  } catch (e) {
    return { ok: false, configured: true, error: e instanceof Error ? e.message : "Request failed" };
  }
}

export async function checkSupabaseHealth(): Promise<CheckResult> {
  try {
    const supabase = createServerSupabaseClient();
    const { error } = await supabase.from("leads").select("id").limit(1);
    if (error) return { ok: false, configured: true, error: error.message };
    return { ok: true, configured: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Supabase client failed" };
  }
}

export function integrationEnvChecklist(): Record<string, boolean> {
  const keys = [
    "N8N_BASE_URL",
    "N8N_WEBHOOK_BASE_URL",
    "N8N_INBOUND_SECRET",
    "N8N_WEBHOOK_CALL_SECRET",
    "OUTREACH_CRON_SECRET",
    "NEXT_PUBLIC_APP_URL",
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "RESEND_API_KEY",
    "RESEND_FROM_EMAIL",
    "EMAIL_FROM",
    "ANTHROPIC_API_KEY",
    "TWILIO_ACCOUNT_SID",
    "TWILIO_AUTH_TOKEN",
    "TWILIO_WHATSAPP_FROM",
    "TWILIO_WEBHOOK_PUBLIC_URL",
    "TWILIO_VALIDATE_WEBHOOK",
    "GOOGLE_CSE_API_KEY",
    "GOOGLE_CSE_CX",
  ] as const;
  const checklist = Object.fromEntries(keys.map((k) => [k, Boolean(process.env[k])])) as Record<
    string,
    boolean
  >;
  // Either n8n base env is enough for outbound calls.
  checklist.N8N_BASE_URL = Boolean(
    process.env.N8N_BASE_URL?.trim() || process.env.N8N_WEBHOOK_BASE_URL?.trim()
  );
  return checklist;
}
