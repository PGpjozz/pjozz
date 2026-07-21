"use client";

import { useEffect, useState } from "react";

import { IntegrationsPanel } from "@/components/settings/integrations-panel";
import { BusinessSettingsPanel } from "@/components/settings/business-settings-panel";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
  const [tab, setTab] = useState<"integrations" | "business" | "overview">("business");

  useEffect(() => {
    // Client-only: read from URL, then localStorage fallback.
    try {
      const sp = new URLSearchParams(window.location.search);
      const t = sp.get("tab");
      if (t === "integrations" || t === "business" || t === "overview") {
        setTab(t);
        return;
      }
      const saved = window.localStorage.getItem("pjozz_settings_tab");
      if (saved === "integrations" || saved === "business" || saved === "overview") {
        setTab(saved);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem("pjozz_settings_tab", tab);
    } catch {
      /* ignore */
    }
    try {
      const sp = new URLSearchParams(window.location.search);
      sp.set("tab", tab);
      const nextUrl = `/settings?${sp.toString()}`;
      window.history.replaceState(null, "", nextUrl);
    } catch {
      /* ignore */
    }
  }, [tab]);

  function TabButton(props: { id: typeof tab; label: string; description: string }) {
    const active = tab === props.id;
    return (
      <button
        type="button"
        role="tab"
        aria-selected={active}
        onClick={() => setTab(props.id)}
        className={cn(
          "flex min-w-[220px] flex-1 flex-col items-start gap-0.5 rounded-xl border px-4 py-3 text-left transition-colors",
          active
            ? "border-primary/40 bg-primary/10 text-foreground"
            : "border-border bg-card/30 text-muted-foreground hover:bg-muted/40 hover:text-foreground"
        )}
      >
        <span className={cn("font-heading text-sm font-semibold", active ? "text-primary" : "text-foreground")}>
          {props.label}
        </span>
        <span className="text-xs">{props.description}</span>
      </button>
    );
  }

  return (
    <div className="mx-auto max-w-5xl">
      <header className="mb-6">
        <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground md:text-3xl">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Business defaults + integrations (env-based secrets).</p>
      </header>

      <div role="tablist" aria-label="Settings sections" className="mb-6 grid gap-3 md:grid-cols-3">
        <TabButton id="business" label="Business" description="Defaults, thresholds, templates, feature flags" />
        <TabButton id="integrations" label="Integrations" description="Env vars + connection tests (no secret values)" />
        <TabButton id="overview" label="Overview" description="Quick reference for required configuration" />
      </div>

      {tab === "integrations" ? (
        <IntegrationsPanel />
      ) : tab === "business" ? (
        <BusinessSettingsPanel />
      ) : (
        <div className="rounded-xl border border-border bg-card/30 p-6">
          <h2 className="font-heading text-sm font-semibold text-foreground">Configuration overview</h2>
          <ul className="mt-4 list-inside list-disc space-y-2 text-sm text-muted-foreground">
            <li>Supabase: URL, anon key (browser), service role (server API routes).</li>
            <li>Anthropic: API key for Claude (lead scoring, briefs, chat, proposals).</li>
            <li>Resend: API key and verified sending domain (`RESEND_FROM_EMAIL` or `EMAIL_FROM`).</li>
            <li>n8n: `N8N_BASE_URL`, inbound secret (`N8N_INBOUND_SECRET` or `OUTREACH_CRON_SECRET`), optional `N8N_WEBHOOK_CALL_SECRET` for outbound webhook calls.</li>
            <li>Twilio WhatsApp: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_FROM`; inbound `POST /api/webhooks/whatsapp` (see `docs/whatsapp-twilio.md`).</li>
            <li>Automation inbound: `POST /api/webhooks/n8n` — wire from n8n HTTP Request nodes.</li>
          </ul>
        </div>
      )}
    </div>
  );
}
