"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, Copy, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type N8nHealth = { ok: boolean; status?: number; latencyMs?: number; error?: string };
type SimpleHealth = { ok: boolean; configured?: boolean; status?: number; latencyMs?: number; error?: string };
type AnthropicHealth = { configured: boolean; liveOk: null };

type HealthPayload = {
  n8n: N8nHealth;
  resend: SimpleHealth;
  twilio: SimpleHealth;
  anthropic: AnthropicHealth;
  supabase: SimpleHealth;
  env: Record<string, boolean>;
};

const LAST_KEY = "pjozz_integration_last_test";

function appOrigin(): string {
  if (typeof window === "undefined") return "";
  const u = process.env.NEXT_PUBLIC_APP_URL;
  if (u) return u.replace(/\/$/, "");
  return window.location.origin.replace(/\/$/, "");
}

function loadLastTests(): Record<string, string> {
  try {
    const raw = localStorage.getItem(LAST_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, string>;
  } catch {
    return {};
  }
}

function saveLastTest(target: string, iso: string) {
  try {
    const cur = loadLastTests();
    cur[target] = iso;
    localStorage.setItem(LAST_KEY, JSON.stringify(cur));
  } catch {
    /* ignore */
  }
}

function Badge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={cn(
        "rounded-full border px-2 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wide",
        ok ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-400" : "border-red-500/50 bg-red-500/10 text-red-400"
      )}
    >
      {label}
    </span>
  );
}

function CopyRow({ label, url }: { label: string; url: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-border bg-background/50 p-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-xs font-medium text-foreground">{label}</p>
        <p className="mt-1 break-all font-mono text-[11px] text-muted-foreground">{url}</p>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="shrink-0 gap-1"
        onClick={() => {
          void navigator.clipboard.writeText(url);
          toast.success("Copied");
        }}
      >
        <Copy className="h-3.5 w-3.5" />
        Copy
      </Button>
    </div>
  );
}

export function IntegrationsPanel() {
  const [health, setHealth] = useState<HealthPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastTests, setLastTests] = useState<Record<string, string>>({});
  const [testing, setTesting] = useState<string | null>(null);

  const origin = useMemo(() => appOrigin(), []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/integrations/health");
      const json = (await res.json()) as { ok: boolean; data?: HealthPayload };
      if (json.ok && json.data) setHealth(json.data);
      else toast.error("Could not load integration health");
    } catch {
      toast.error("Could not load integration health");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setLastTests(loadLastTests());
    void load();
  }, [load]);

  const runTest = async (target: "n8n" | "resend" | "twilio" | "anthropic" | "supabase") => {
    setTesting(target);
    try {
      const res = await fetch("/api/integrations/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target }),
      });
      const json = (await res.json()) as { ok: boolean; data?: { testedAt: string; result: SimpleHealth | N8nHealth }; error?: string };
      if (!json.ok) {
        toast.error(json.error ?? "Test failed");
        return;
      }
      const t = json.data?.testedAt ?? new Date().toISOString();
      saveLastTest(target, t);
      setLastTests(loadLastTests());
      toast.success(`${target} test finished`);
      await load();
    } catch {
      toast.error("Test request failed");
    } finally {
      setTesting(null);
    }
  };

  const webhookRows = useMemo(() => {
    const base = origin || "(set NEXT_PUBLIC_APP_URL for absolute URLs)";
    return [
      { label: "n8n → Pjozz (automation inbound)", url: `${base}/api/webhooks/n8n` },
      { label: "Resend → Pjozz (email events)", url: `${base}/api/webhooks/email` },
      { label: "Twilio → Pjozz (WhatsApp inbound)", url: `${base}/api/webhooks/whatsapp` },
    ];
  }, [origin]);

  if (loading && !health) {
    return (
      <div className="flex items-center gap-2 py-12 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading integrations…
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-heading text-lg font-semibold text-foreground">Integrations</h2>
          <p className="mt-1 text-sm text-muted-foreground">n8n, email, WhatsApp (Twilio), AI, and database connectivity.</p>
        </div>
        <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => void load()} disabled={loading}>
          <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <IntegrationCard
          title="n8n"
          description="Self-hosted automation. Server uses N8N_BASE_URL (default http://localhost:5678) and /healthz for status."
          badge={<Badge ok={!!health?.n8n.ok} label={health?.n8n.ok ? "Reachable" : "Error"} />}
          meta={
            health?.n8n.latencyMs != null ? (
              <span className="text-xs text-muted-foreground">Last ping: {health.n8n.latencyMs}ms · HTTP {health.n8n.status}</span>
            ) : health?.n8n.error ? (
              <span className="text-xs text-red-400">{health.n8n.error}</span>
            ) : null
          }
          lastTest={lastTests.n8n}
          testing={testing === "n8n"}
          onTest={() => void runTest("n8n")}
        />
        <IntegrationCard
          title="Resend"
          description="Transactional email + webhooks"
          badge={<Badge ok={!!health?.resend.ok && !!health.resend.configured} label={health?.resend.configured ? (health.resend.ok ? "Connected" : "Error") : "Not configured"} />}
          meta={
            health?.resend.status != null ? (
              <span className="text-xs text-muted-foreground">HTTP {health.resend.status}</span>
            ) : health?.resend.error ? (
              <span className="text-xs text-red-400">{health.resend.error}</span>
            ) : null
          }
          lastTest={lastTests.resend}
          testing={testing === "resend"}
          onTest={() => void runTest("resend")}
        />
        <IntegrationCard
          title="Twilio (WhatsApp)"
          description="Campaign WhatsApp steps + inbound replies. Set TWILIO_WHATSAPP_FROM (whatsapp:+…)."
          badge={
            <Badge
              ok={!!health?.twilio.ok && !!health.twilio.configured}
              label={health?.twilio.configured ? (health.twilio.ok ? "Connected" : "Error") : "Not configured"}
            />
          }
          meta={
            health?.twilio.status != null ? (
              <span className="text-xs text-muted-foreground">HTTP {health.twilio.status}</span>
            ) : health?.twilio.error ? (
              <span className="text-xs text-red-400">{health.twilio.error}</span>
            ) : null
          }
          lastTest={lastTests.twilio}
          testing={testing === "twilio"}
          onTest={() => void runTest("twilio")}
        />
        <IntegrationCard
          title="Anthropic (Claude)"
          description="Lead scoring, briefs, chat, proposals"
          badge={
            <Badge
              ok={!!health?.anthropic.configured}
              label={health?.anthropic.configured ? "API key set" : "Missing key"}
            />
          }
          meta={<span className="text-xs text-muted-foreground">Use “Test connection” for a live API check (minimal token use).</span>}
          lastTest={lastTests.anthropic}
          testing={testing === "anthropic"}
          onTest={() => void runTest("anthropic")}
        />
        <IntegrationCard
          title="Supabase"
          description="CRM database + realtime"
          badge={<Badge ok={!!health?.supabase.ok} label={health?.supabase.ok ? "Connected" : "Error"} />}
          meta={health?.supabase.error ? <span className="text-xs text-red-400">{health.supabase.error}</span> : null}
          lastTest={lastTests.supabase}
          testing={testing === "supabase"}
          onTest={() => void runTest("supabase")}
        />
      </div>

      <section>
        <h3 className="mb-3 font-heading text-sm font-semibold text-foreground">Webhook URLs</h3>
        <p className="mb-3 text-xs text-muted-foreground">Paste into n8n HTTP nodes, Calendly (via n8n), or Resend dashboard.</p>
        <div className="space-y-2">
          {webhookRows.map((r) => (
            <CopyRow key={r.label} label={r.label} url={r.url} />
          ))}
        </div>
      </section>

      <section>
        <h3 className="mb-3 font-heading text-sm font-semibold text-foreground">Environment variables</h3>
        <p className="mb-3 text-xs text-muted-foreground">Shows set vs missing only — values are never exposed.</p>
        <ul className="grid gap-2 sm:grid-cols-2">
          {health &&
            Object.entries(health.env).map(([key, set]) => (
              <li key={key} className="flex items-center justify-between gap-2 rounded border border-border bg-card/40 px-3 py-2 font-mono text-[11px]">
                <span className="truncate text-muted-foreground">{key}</span>
                {set ? (
                  <span className="flex shrink-0 items-center gap-1 text-emerald-500">
                    <Check className="h-3.5 w-3.5" /> Set
                  </span>
                ) : (
                  <span className="shrink-0 text-amber-500">Missing</span>
                )}
              </li>
            ))}
        </ul>
      </section>

      <p className="text-xs text-muted-foreground">
        n8n workflow recipes: <code className="rounded bg-muted px-1">docs/n8n-workflows.md</code> · WhatsApp / Twilio:{" "}
        <code className="rounded bg-muted px-1">docs/whatsapp-twilio.md</code>
      </p>
    </div>
  );
}

function IntegrationCard({
  title,
  description,
  badge,
  meta,
  lastTest,
  testing,
  onTest,
}: {
  title: string;
  description: string;
  badge: ReactNode;
  meta: ReactNode;
  lastTest?: string;
  testing: boolean;
  onTest: () => void;
}) {
  return (
    <div className="rounded-xl border border-border bg-card/30 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h4 className="font-heading text-sm font-semibold text-foreground">{title}</h4>
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        </div>
        {badge}
      </div>
      {meta ? <div className="mt-3">{meta}</div> : null}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button type="button" variant="secondary" size="sm" disabled={testing} onClick={onTest}>
          {testing ? (
            <>
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              Testing…
            </>
          ) : (
            "Test connection"
          )}
        </Button>
        {lastTest ? (
          <span className="text-[10px] text-muted-foreground">Last test: {new Date(lastTest).toLocaleString()}</span>
        ) : (
          <span className="text-[10px] text-muted-foreground">Never tested on this browser</span>
        )}
      </div>
    </div>
  );
}
