"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useFeatureFlags } from "@/components/flags/feature-flags";
import type { LeadApi } from "@/lib/leads/mappers";
import { defaultCampaignSettings, newStep } from "@/lib/campaigns/defaults";
import { buildSyntheticLeadForAi } from "@/lib/campaigns/synthetic-lead";
import type { LeadServiceType, OutreachSequenceStep } from "@/types";

import { SERVICE_LABEL } from "@/components/leads/lead-constants";
import { SequenceBuilder } from "./sequence-builder";

const SERVICES: LeadServiceType[] = [
  "webapp",
  "mobileapp",
  "automation",
  "network",
  "security_cam",
  "software",
];

const EMAIL_TYPES = ["initial", "followup1", "followup2", "breakup"] as const;

export function CampaignNewWizard() {
  const router = useRouter();
  const { flags } = useFeatureFlags();
  const [step, setStep] = useState(1);
  const [serviceFocus, setServiceFocus] = useState<LeadServiceType>("webapp");
  const [csv, setCsv] = useState("");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [pool, setPool] = useState<LeadApi[]>([]);
  const [steps, setSteps] = useState<OutreachSequenceStep[]>([]);
  const [resolvedLeadIds, setResolvedLeadIds] = useState<string[]>([]);
  const [genBusy, setGenBusy] = useState(false);
  const [importBusy, setImportBusy] = useState(false);
  const [campaignName, setCampaignName] = useState("");
  const [launchBusy, setLaunchBusy] = useState(false);

  const loadPool = useCallback(async () => {
    const res = await fetch("/api/leads?pageSize=100");
    const json = (await res.json()) as { ok: boolean; data?: { leads: LeadApi[] } };
    if (json.ok && json.data) setPool(json.data.leads);
  }, []);

  useEffect(() => {
    void loadPool();
  }, [loadPool]);

  function parseCsvForCreates(): { companyName: string; email: string; contactName: string }[] {
    const lines = csv.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const out: { companyName: string; email: string; contactName: string }[] = [];
    for (const line of lines) {
      const parts = line.split(",").map((p) => p.trim());
      if (parts.length >= 2 && parts[1]!.includes("@")) {
        out.push({
          companyName: parts[0] || "Company",
          email: parts[1]!,
          contactName: parts[2] || "Team",
        });
      }
    }
    return out;
  }

  async function resolveLeadIdsForStep1(): Promise<string[]> {
    const fromCsv = parseCsvForCreates();
    const created: string[] = [];
    for (const row of fromCsv) {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: row.companyName,
          email: row.email,
          contactName: row.contactName,
          serviceTypes: [serviceFocus],
          skipAi: true,
        }),
      });
      const json = (await res.json()) as { ok: boolean; data?: LeadApi; error?: string };
      if (json.ok && json.data) created.push(json.data.id);
      else toast.error(json.error ?? "Lead create failed");
    }
    const fromPick = Array.from(picked);
    return Array.from(new Set([...created, ...fromPick]));
  }

  async function goToStep2() {
    setImportBusy(true);
    try {
      const ids = await resolveLeadIdsForStep1();
      if (!ids.length) {
        toast.error("Add CSV rows and/or pick at least one lead");
        return;
      }
      setResolvedLeadIds(ids);
      setStep(2);
    } finally {
      setImportBusy(false);
    }
  }

  async function runAiSequence() {
    if (!flags.enableAi) {
      toast.error("AI is disabled in Settings.");
      return;
    }
    setGenBusy(true);
    try {
      const lead = buildSyntheticLeadForAi(serviceFocus, campaignName || "Target account");
      const built: OutreachSequenceStep[] = [];
      let prev = "";
      for (let i = 0; i < EMAIL_TYPES.length; i++) {
        const emailType = EMAIL_TYPES[i]!;
        const res = await fetch("/api/ai/generate-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lead: { ...lead, serviceType: serviceFocus },
            emailType,
            previousContext: prev || undefined,
          }),
        });
        const json = (await res.json()) as { ok: boolean; data?: { subject: string; body: string }; error?: string };
        if (!json.ok || !json.data) throw new Error(json.error ?? "AI failed");
        prev = `${json.data.subject}\n${json.data.body}`;
        built.push(
          newStep({
            channel: "email",
            delayKind: i === 0 ? "immediate" : "wait_days",
            delayDays: i === 0 ? 0 : i === 1 ? 3 : i === 2 ? 4 : 7,
            subject: json.data.subject,
            body: json.data.body,
            templateSource: "ai",
          })
        );
      }
      setSteps(built);
      toast.success("Sequence generated");
      setStep(3);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setGenBusy(false);
    }
  }

  async function launch() {
    if (!campaignName.trim()) {
      toast.error("Campaign name required");
      return;
    }
    setLaunchBusy(true);
    try {
      const leadIds = resolvedLeadIds;
      if (!leadIds.length) {
        toast.error("No leads — go back to step 1");
        setLaunchBusy(false);
        return;
      }
      const settings = { ...defaultCampaignSettings(), serviceFocus };
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: campaignName.trim(),
          type: "multichannel",
          sequence: steps,
          settings,
          status: "active",
        }),
      });
      const json = (await res.json()) as { ok: boolean; data?: { id: string }; error?: string };
      if (!json.ok || !json.data) throw new Error(json.error ?? "Create failed");
      const campaignId = json.data.id;
      const en = await fetch(`/api/campaigns/${campaignId}/enroll`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadIds }),
      });
      const enj = (await en.json()) as { ok: boolean; error?: string };
      if (!enj.ok) throw new Error(enj.error ?? "Enroll failed");
      toast.success("Campaign launched");
      router.push(`/outreach/${campaignId}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Launch failed");
    } finally {
      setLaunchBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <Link href="/outreach" className="text-xs text-primary hover:underline">
          ← Campaigns
        </Link>
        <h1 className="mt-2 font-heading text-2xl font-semibold text-foreground">New campaign</h1>
        <p className="mt-1 text-sm text-muted-foreground">Four steps — service focus, AI sequence, review, launch.</p>
      </div>

      <div className="flex gap-2 font-mono text-xs">
        {[1, 2, 3, 4].map((n) => (
          <span
            key={n}
            className={`rounded-full px-3 py-1 ${step === n ? "bg-primary text-black" : "bg-muted text-muted-foreground"}`}
          >
            Step {n}
          </span>
        ))}
      </div>

      {step === 1 ? (
        <div className="space-y-4 rounded-xl border border-border bg-card/30 p-4">
          <h2 className="font-heading text-sm font-semibold text-primary">1 · Audience & service focus</h2>
          <div>
            <label className="mb-1 block text-xs uppercase text-muted-foreground">Service type (AI prompts)</label>
            <select
              className="pj-input w-full font-mono text-sm"
              value={serviceFocus}
              onChange={(e) => setServiceFocus(e.target.value as LeadServiceType)}
            >
              {SERVICES.map((s) => (
                <option key={s} value={s}>
                  {SERVICE_LABEL[s] ?? s}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs uppercase text-muted-foreground">CSV (company,email,name optional)</label>
            <textarea
              className="pj-input min-h-[100px] w-full font-mono text-xs"
              placeholder={"Acme Ltd,hello@acme.co.za,Jane Doe\n..."}
              value={csv}
              onChange={(e) => setCsv(e.target.value)}
            />
          </div>
          <div>
            <p className="mb-2 text-xs uppercase text-muted-foreground">Or pick existing leads</p>
            <div className="max-h-48 space-y-1 overflow-y-auto rounded border border-border p-2">
              {pool.map((l) => (
                <label key={l.id} className="flex cursor-pointer items-center gap-2 font-mono text-xs">
                  <input
                    type="checkbox"
                    checked={picked.has(l.id)}
                    onChange={() =>
                      setPicked((prev) => {
                        const n = new Set(prev);
                        if (n.has(l.id)) n.delete(l.id);
                        else n.add(l.id);
                        return n;
                      })
                    }
                  />
                  <span className="text-foreground">{l.companyName}</span>
                  <span className="text-muted-foreground">{l.email}</span>
                </label>
              ))}
            </div>
          </div>
          <Button type="button" disabled={importBusy} onClick={() => void goToStep2()}>
            {importBusy ? "Importing…" : "Continue"}
          </Button>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="space-y-4 rounded-xl border border-border bg-card/30 p-4">
          <h2 className="font-heading text-sm font-semibold text-primary">2 · AI sequence</h2>
          <p className="text-sm text-muted-foreground">
            Calls <code className="rounded bg-muted px-1">/api/ai/generate-email</code> for initial, follow-up 1, follow-up 2, and breakup.
          </p>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={() => setStep(1)}>
              Back
            </Button>
            <Button
              type="button"
              disabled={genBusy || !flags.enableAi}
              title={!flags.enableAi ? "AI is disabled in Settings" : "Generate sequence"}
              onClick={() => void runAiSequence()}
            >
              {genBusy ? "Generating…" : "Generate sequence"}
            </Button>
          </div>
        </div>
      ) : null}

      {step === 3 ? (
        <div className="space-y-4 rounded-xl border border-border bg-card/30 p-4">
          <h2 className="font-heading text-sm font-semibold text-primary">3 · Review & edit</h2>
          <SequenceBuilder steps={steps} onChange={setSteps} serviceFocus={serviceFocus} companyHint={campaignName || "Campaign"} />
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={() => setStep(2)}>
              Back
            </Button>
            <Button type="button" onClick={() => setStep(4)}>
              Continue
            </Button>
          </div>
        </div>
      ) : null}

      {step === 4 ? (
        <div className="space-y-4 rounded-xl border border-border bg-card/30 p-4">
          <h2 className="font-heading text-sm font-semibold text-primary">4 · Schedule & launch</h2>
          <p className="text-xs text-muted-foreground">
            Sends use Mon–Fri 8–17 SAST and daily cap from defaults (edit later on the campaign page).
          </p>
          <div>
            <label className="mb-1 block text-xs uppercase text-muted-foreground">Campaign name</label>
            <input
              className="pj-input w-full font-mono text-sm"
              value={campaignName}
              onChange={(e) => setCampaignName(e.target.value)}
              placeholder="Q2 SMB automation push"
            />
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={() => setStep(3)}>
              Back
            </Button>
            <Button type="button" disabled={launchBusy} onClick={() => void launch()}>
              {launchBusy ? "Launching…" : "Launch campaign"}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
