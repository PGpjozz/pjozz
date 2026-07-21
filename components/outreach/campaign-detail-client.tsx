"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useFeatureFlags } from "@/components/flags/feature-flags";
import type { Campaign, OutreachSequenceStep } from "@/types";

import { CampaignLeadsTable, type EnrollmentRow } from "./campaign-leads-table";
import { CampaignSettingsForm } from "./campaign-settings-form";
import { SequenceBuilder } from "./sequence-builder";

export function CampaignDetailClient({ id }: { id: string }) {
  const { flags } = useFeatureFlags();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [enrollments, setEnrollments] = useState<EnrollmentRow[]>([]);
  const [steps, setSteps] = useState<OutreachSequenceStep[]>([]);
  const [leadIdsInput, setLeadIdsInput] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/campaigns/${id}`);
      const json = (await res.json()) as {
        ok: boolean;
        data?: { campaign: Campaign; enrollments: EnrollmentRow[] };
      };
      if (json.ok && json.data) {
        setCampaign(json.data.campaign);
        setEnrollments(json.data.enrollments);
        setSteps(json.data.campaign.sequence);
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveSequence() {
    try {
      const res = await fetch(`/api/campaigns/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sequence: steps }),
      });
      const json = (await res.json()) as { ok: boolean; error?: string };
      if (!json.ok) throw new Error(json.error ?? "Save failed");
      toast.success("Sequence saved");
      void load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    }
  }

  async function enroll() {
    const ids = leadIdsInput
      .split(/[\s,]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const leadIds = ids.filter((x) => uuid.test(x));
    if (!leadIds.length) {
      toast.error("Paste one or more lead UUIDs (comma or newline separated)");
      return;
    }
    try {
      const res = await fetch(`/api/campaigns/${id}/enroll`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadIds }),
      });
      const json = (await res.json()) as { ok: boolean; error?: string };
      if (!json.ok) throw new Error(json.error ?? "Enroll failed");
      toast.success("Leads enrolled");
      setLeadIdsInput("");
      void load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Enroll failed");
    }
  }

  if (loading || !campaign) {
    return <div className="py-16 text-center font-mono text-sm text-muted-foreground">Loading campaign…</div>;
  }

  const serviceFocus = campaign.settings?.serviceFocus ?? "webapp";

  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link href="/outreach" className="text-xs text-primary hover:underline">
            ← Campaigns
          </Link>
          <h1 className="mt-2 font-heading text-2xl font-semibold text-foreground">{campaign.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{campaign.description || "No description"}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={() => void saveSequence()}>
            Save sequence
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={!flags.enableOutreachAutomation}
            title={!flags.enableOutreachAutomation ? "Outreach automation is disabled in Settings" : "Run send-next batch"}
            onClick={async () => {
              try {
                if (!flags.enableOutreachAutomation) {
                  toast.error("Outreach automation is disabled in Settings.");
                  return;
                }
                const secret = prompt("Optional: paste OUTREACH_CRON_SECRET for auth (leave empty if unset in env)");
                const headers: Record<string, string> = { "Content-Type": "application/json" };
                if (secret) headers.Authorization = `Bearer ${secret}`;
                const res = await fetch(`/api/campaigns/${id}/send-next`, { method: "POST", headers });
                const json = (await res.json()) as { ok: boolean; data?: { sent: number; errors?: string[] }; error?: string };
                if (!json.ok) throw new Error(json.error ?? "Send failed");
                toast.success(`Sent batch: ${json.data?.sent ?? 0}`);
                if (json.data?.errors?.length) toast.info(json.data.errors.join("; "));
                void load();
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "Error");
              }
            }}
          >
            Run send-next (cron)
          </Button>
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="font-heading text-sm font-semibold uppercase tracking-wide text-primary">Sequence builder</h2>
        <SequenceBuilder
          steps={steps}
          onChange={setSteps}
          serviceFocus={serviceFocus}
          companyHint={campaign.name}
        />
      </section>

      <section className="space-y-3">
        <h2 className="font-heading text-sm font-semibold uppercase tracking-wide text-primary">Leads in campaign</h2>
        <div className="flex flex-col gap-2 rounded-xl border border-border bg-card/20 p-3 sm:flex-row">
          <textarea
            className="pj-input min-h-[72px] flex-1 font-mono text-xs"
            placeholder="Paste lead UUIDs (comma or newline)…"
            value={leadIdsInput}
            onChange={(e) => setLeadIdsInput(e.target.value)}
          />
          <Button type="button" className="shrink-0 self-start" onClick={() => void enroll()}>
            Enroll leads
          </Button>
        </div>
        <CampaignLeadsTable campaignId={id} rows={enrollments} onChanged={() => void load()} />
      </section>

      <CampaignSettingsForm campaignId={id} campaign={campaign} onSaved={() => void load()} />
    </div>
  );
}
