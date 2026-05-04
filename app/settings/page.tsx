"use client";

import { useState } from "react";

import { IntegrationsPanel } from "@/components/settings/integrations-panel";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
  const [tab, setTab] = useState<"integrations" | "overview">("integrations");

  return (
    <div className="mx-auto max-w-5xl">
      <header className="mb-6">
        <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground md:text-3xl">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Integrations, secrets layout, and automation hooks.</p>
      </header>

      <div className="mb-6 flex flex-wrap gap-2 border-b border-border pb-2">
        <Button
          type="button"
          variant={tab === "integrations" ? "secondary" : "ghost"}
          size="sm"
          className={cn(tab === "integrations" && "bg-primary/15 text-primary")}
          onClick={() => setTab("integrations")}
        >
          Integrations
        </Button>
        <Button
          type="button"
          variant={tab === "overview" ? "secondary" : "ghost"}
          size="sm"
          className={cn(tab === "overview" && "bg-primary/15 text-primary")}
          onClick={() => setTab("overview")}
        >
          Overview
        </Button>
      </div>

      {tab === "integrations" ? (
        <IntegrationsPanel />
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
