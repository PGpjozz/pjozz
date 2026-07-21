"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useFeatureFlags } from "@/components/flags/feature-flags";

type SettingKey =
  | "ai.lead_thresholds"
  | "outreach.defaults"
  | "billing.defaults"
  | "proposals.defaults"
  | "features.flags";

type ApiOk = { ok: true; data: { key: SettingKey; value: unknown } };
type ApiErr = { ok: false; error: string; issues?: unknown };

async function loadSetting(key: SettingKey) {
  const res = await fetch(`/api/settings/${encodeURIComponent(key)}`, { cache: "no-store" });
  const json = (await res.json()) as ApiOk | ApiErr;
  if (!json.ok) throw new Error(json.error);
  return json.data.value;
}

async function saveSetting(key: SettingKey, value: unknown) {
  const res = await fetch(`/api/settings/${encodeURIComponent(key)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ value }),
  });
  const json = (await res.json()) as ApiOk | ApiErr;
  if (!json.ok) throw new Error(json.error);
  return json.data.value;
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-end justify-between gap-2">
        <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </label>
        {hint ? <span className="text-[11px] text-muted-foreground">{hint}</span> : null}
      </div>
      {children}
    </div>
  );
}

function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={[
        "h-10 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground outline-none",
        "placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/40",
        props.className ?? "",
      ].join(" ")}
    />
  );
}

function NumberInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <TextInput {...props} inputMode="numeric" />;
}

function Switch({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={[
        "relative h-6 w-11 rounded-full border transition-colors",
        checked ? "border-primary/40 bg-primary/45" : "border-border bg-muted/60",
      ].join(" ")}
      aria-pressed={checked}
    >
      <span
        className={[
          "absolute top-0.5 h-5 w-5 rounded-full shadow transition-transform",
          checked ? "bg-primary" : "bg-background",
          checked ? "translate-x-5" : "translate-x-0.5",
        ].join(" ")}
      />
    </button>
  );
}

export function BusinessSettingsPanel() {
  const { reload: reloadFeatureFlags } = useFeatureFlags();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const [ai, setAi] = useState({
    hotLeadScore: 70,
    qualifiedScore: 70,
    staleLeadDays: 5,
    riskyDealDaysInStage: 14,
    followUpGraceDays: 2,
  });
  const [outreach, setOutreach] = useState({
    sendWindow: { weekdays: [1, 2, 3, 4, 5], startHour: 8, endHour: 17, timezone: "Africa/Johannesburg" },
    dailySendLimit: 50,
    pauseOnReply: true,
    blocklistOnUnsubscribe: true,
  });
  const [billing, setBilling] = useState({ vatRate: 0.15, currency: "ZAR", invoicePrefix: "INV" });
  const [proposals, setProposals] = useState({
    currency: "ZAR",
    defaultTitle: "Draft proposal",
    template: {
      sections: [
        { key: "executiveSummary", title: "Executive summary", enabled: true, defaultText: "" },
        { key: "problemStatement", title: "Problem statement", enabled: true, defaultText: "" },
        { key: "proposedSolution", title: "Proposed solution", enabled: true, defaultText: "" },
        { key: "whyPjozz", title: "Why Pjozz", enabled: true, defaultText: "" },
        { key: "nextSteps", title: "Next steps", enabled: true, defaultText: "" },
      ],
    },
  });
  const [flags, setFlags] = useState({
    enableAi: true,
    enableWhatsApp: true,
    enableResendEmail: true,
    enableOutreachAutomation: true,
  });

  const dirty = useMemo(() => ({ ai, outreach, billing, proposals, flags }), [ai, outreach, billing, proposals, flags]);

  const reload = async () => {
    setLoading(true);
    try {
      const [aiV, outreachV, billingV, proposalsV, flagsV] = await Promise.all([
        loadSetting("ai.lead_thresholds"),
        loadSetting("outreach.defaults"),
        loadSetting("billing.defaults"),
        loadSetting("proposals.defaults"),
        loadSetting("features.flags"),
      ]);
      setAi(aiV as typeof ai);
      setOutreach(outreachV as typeof outreach);
      setBilling(billingV as typeof billing);
      setProposals(proposalsV as typeof proposals);
      setFlags(flagsV as typeof flags);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveAll = async () => {
    setSaving("all");
    try {
      await Promise.all([
        saveSetting("ai.lead_thresholds", dirty.ai),
        saveSetting("outreach.defaults", dirty.outreach),
        saveSetting("billing.defaults", dirty.billing),
        saveSetting("proposals.defaults", dirty.proposals),
        saveSetting("features.flags", dirty.flags),
      ]);
      toast.success("Business settings saved");
      await reloadFeatureFlags();
      await reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return <div className="py-12 text-sm text-muted-foreground">Loading business settings…</div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-heading text-lg font-semibold text-foreground">Business settings</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Stored in Supabase (<code className="rounded bg-muted px-1">settings</code> table). Secrets stay in env vars.
          </p>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => void reload()} disabled={saving != null}>
            Reload
          </Button>
          <Button type="button" size="sm" onClick={() => void saveAll()} disabled={saving != null}>
            {saving ? "Saving…" : "Save all"}
          </Button>
        </div>
      </div>

      <section className="rounded-xl border border-border bg-card/30 p-5">
        <h3 className="font-heading text-sm font-semibold text-foreground">AI thresholds</h3>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Field label="Hot lead score" hint="Daily brief uses this">
            <NumberInput
              value={ai.hotLeadScore}
              onChange={(e) => setAi((s) => ({ ...s, hotLeadScore: Number(e.target.value) }))}
            />
          </Field>
          <Field label="Qualified score" hint="UI highlighting / future automation">
            <NumberInput
              value={ai.qualifiedScore}
              onChange={(e) => setAi((s) => ({ ...s, qualifiedScore: Number(e.target.value) }))}
            />
          </Field>
          <Field label="Stale lead days" hint="Default 5">
            <NumberInput
              value={ai.staleLeadDays}
              onChange={(e) => setAi((s) => ({ ...s, staleLeadDays: Number(e.target.value) }))}
            />
          </Field>
          <Field label="Risky deal days in stage" hint="Default 14">
            <NumberInput
              value={ai.riskyDealDaysInStage}
              onChange={(e) => setAi((s) => ({ ...s, riskyDealDaysInStage: Number(e.target.value) }))}
            />
          </Field>
          <Field label="Follow-up grace days" hint="Default 2">
            <NumberInput
              value={ai.followUpGraceDays}
              onChange={(e) => setAi((s) => ({ ...s, followUpGraceDays: Number(e.target.value) }))}
            />
          </Field>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card/30 p-5">
        <h3 className="font-heading text-sm font-semibold text-foreground">Outreach defaults</h3>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Field label="Weekdays (1=Mon … 7=Sun)" hint="Comma-separated">
            <TextInput
              value={outreach.sendWindow.weekdays.join(",")}
              onChange={(e) =>
                setOutreach((s) => ({
                  ...s,
                  sendWindow: {
                    ...s.sendWindow,
                    weekdays: e.target.value
                      .split(",")
                      .map((x) => Number(x.trim()))
                      .filter((n) => Number.isFinite(n) && n >= 1 && n <= 7),
                  },
                }))
              }
            />
          </Field>
          <Field label="Timezone" hint="IANA, e.g. Africa/Johannesburg">
            <TextInput
              value={outreach.sendWindow.timezone}
              onChange={(e) => setOutreach((s) => ({ ...s, sendWindow: { ...s.sendWindow, timezone: e.target.value } }))}
            />
          </Field>
          <Field label="Start hour (0-23)">
            <NumberInput
              value={outreach.sendWindow.startHour}
              onChange={(e) =>
                setOutreach((s) => ({ ...s, sendWindow: { ...s.sendWindow, startHour: Number(e.target.value) } }))
              }
            />
          </Field>
          <Field label="End hour (1-24)">
            <NumberInput
              value={outreach.sendWindow.endHour}
              onChange={(e) =>
                setOutreach((s) => ({ ...s, sendWindow: { ...s.sendWindow, endHour: Number(e.target.value) } }))
              }
            />
          </Field>
          <Field label="Daily send limit">
            <NumberInput
              value={outreach.dailySendLimit}
              onChange={(e) => setOutreach((s) => ({ ...s, dailySendLimit: Number(e.target.value) }))}
            />
          </Field>
          <div className="grid gap-3">
            <div className="flex items-center justify-between rounded-lg border border-border bg-background/50 p-3">
              <div>
                <p className="text-sm font-medium text-foreground">Pause on reply</p>
                <p className="text-xs text-muted-foreground">Auto-pause enrollments when a reply is detected.</p>
              </div>
              <Switch checked={outreach.pauseOnReply} onChange={(v) => setOutreach((s) => ({ ...s, pauseOnReply: v }))} />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border bg-background/50 p-3">
              <div>
                <p className="text-sm font-medium text-foreground">Blocklist on unsubscribe</p>
                <p className="text-xs text-muted-foreground">Suppress future sends for unsubscribed emails.</p>
              </div>
              <Switch
                checked={outreach.blocklistOnUnsubscribe}
                onChange={(v) => setOutreach((s) => ({ ...s, blocklistOnUnsubscribe: v }))}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card/30 p-5">
        <h3 className="font-heading text-sm font-semibold text-foreground">Billing defaults</h3>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <Field label="VAT rate" hint="0.15 = 15%">
            <TextInput value={String(billing.vatRate)} onChange={(e) => setBilling((s) => ({ ...s, vatRate: Number(e.target.value) }))} />
          </Field>
          <Field label="Currency" hint="e.g. ZAR">
            <TextInput value={billing.currency} onChange={(e) => setBilling((s) => ({ ...s, currency: e.target.value }))} />
          </Field>
          <Field label="Invoice prefix" hint="e.g. INV">
            <TextInput value={billing.invoicePrefix} onChange={(e) => setBilling((s) => ({ ...s, invoicePrefix: e.target.value }))} />
          </Field>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card/30 p-5">
        <h3 className="font-heading text-sm font-semibold text-foreground">Proposal defaults</h3>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <Field label="Currency">
            <TextInput value={proposals.currency} onChange={(e) => setProposals((s) => ({ ...s, currency: e.target.value }))} />
          </Field>
          <Field label="Default title">
            <TextInput
              value={proposals.defaultTitle}
              onChange={(e) => setProposals((s) => ({ ...s, defaultTitle: e.target.value }))}
            />
          </Field>
        </div>

        <div className="mt-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h4 className="font-heading text-sm font-semibold text-foreground">Template sections</h4>
              <p className="mt-1 text-xs text-muted-foreground">Controls which sections appear by default and their starting text.</p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                setProposals((s) => ({
                  ...s,
                  template: {
                    ...s.template,
                    sections: [
                      ...(s.template?.sections ?? []),
                      {
                        key: `section_${Date.now()}`,
                        title: "New section",
                        enabled: true,
                        defaultText: "",
                      },
                    ],
                  },
                }))
              }
            >
              Add section
            </Button>
          </div>

          <div className="space-y-3">
            {(proposals.template?.sections ?? []).map((sec, idx) => (
              <div key={`${sec.key}_${idx}`} className="rounded-xl border border-border bg-background/40 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="grid gap-3 md:grid-cols-2">
                      <Field label="Key" hint="Stable id (no spaces)">
                        <TextInput
                          value={sec.key}
                          onChange={(e) =>
                            setProposals((s) => ({
                              ...s,
                              template: {
                                ...s.template,
                                sections: (s.template.sections ?? []).map((x, i) =>
                                  i === idx ? { ...x, key: e.target.value } : x
                                ),
                              },
                            }))
                          }
                          placeholder="e.g. scope"
                        />
                      </Field>
                      <Field label="Title" hint="Shown in UI/PDF/email">
                        <TextInput
                          value={sec.title}
                          onChange={(e) =>
                            setProposals((s) => ({
                              ...s,
                              template: {
                                ...s.template,
                                sections: (s.template.sections ?? []).map((x, i) =>
                                  i === idx ? { ...x, title: e.target.value } : x
                                ),
                              },
                            }))
                          }
                          placeholder="e.g. Deliverables"
                        />
                      </Field>
                    </div>

                    <div className="mt-3">
                      <Field label="Default text" hint="Optional">
                        <textarea
                          value={sec.defaultText ?? ""}
                          onChange={(e) =>
                            setProposals((s) => ({
                              ...s,
                              template: {
                                ...s.template,
                                sections: (s.template.sections ?? []).map((x, i) =>
                                  i === idx ? { ...x, defaultText: e.target.value } : x
                                ),
                              },
                            }))
                          }
                          rows={4}
                          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/40"
                          placeholder="Starter copy for this section…"
                        />
                      </Field>
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-col gap-2">
                    <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background/50 px-3 py-2">
                      <span className="text-xs font-medium text-muted-foreground">Enabled</span>
                      <Switch
                        checked={sec.enabled !== false}
                        onChange={(v) =>
                          setProposals((s) => ({
                            ...s,
                            template: {
                              ...s.template,
                              sections: (s.template.sections ?? []).map((x, i) =>
                                i === idx ? { ...x, enabled: v } : x
                              ),
                            },
                          }))
                        }
                      />
                    </div>

                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={idx === 0}
                        onClick={() =>
                          setProposals((s) => {
                            const list = [...(s.template.sections ?? [])];
                            const tmp = list[idx - 1];
                            list[idx - 1] = list[idx];
                            list[idx] = tmp;
                            return { ...s, template: { ...s.template, sections: list } };
                          })
                        }
                      >
                        Up
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={idx >= (proposals.template?.sections ?? []).length - 1}
                        onClick={() =>
                          setProposals((s) => {
                            const list = [...(s.template.sections ?? [])];
                            const tmp = list[idx + 1];
                            list[idx + 1] = list[idx];
                            list[idx] = tmp;
                            return { ...s, template: { ...s.template, sections: list } };
                          })
                        }
                      >
                        Down
                      </Button>
                    </div>

                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() =>
                        setProposals((s) => ({
                          ...s,
                          template: { ...s.template, sections: (s.template.sections ?? []).filter((_, i) => i !== idx) },
                        }))
                      }
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {(proposals.template?.sections ?? []).length === 0 ? (
            <p className="mt-3 text-xs text-muted-foreground">No sections yet. Click “Add section”.</p>
          ) : null}
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card/30 p-5">
        <h3 className="font-heading text-sm font-semibold text-foreground">Feature flags</h3>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="flex items-center justify-between rounded-lg border border-border bg-background/50 p-3">
            <div>
              <p className="text-sm font-medium text-foreground">Enable AI</p>
              <p className="text-xs text-muted-foreground">Lead scoring, briefs, proposals, chat.</p>
            </div>
            <Switch checked={flags.enableAi} onChange={(v) => setFlags((s) => ({ ...s, enableAi: v }))} />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border bg-background/50 p-3">
            <div>
              <p className="text-sm font-medium text-foreground">Enable Resend email</p>
              <p className="text-xs text-muted-foreground">Outbound campaign emails and proposal sending.</p>
            </div>
            <Switch checked={flags.enableResendEmail} onChange={(v) => setFlags((s) => ({ ...s, enableResendEmail: v }))} />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border bg-background/50 p-3">
            <div>
              <p className="text-sm font-medium text-foreground">Enable WhatsApp</p>
              <p className="text-xs text-muted-foreground">Twilio outbound + inbound workflow.</p>
            </div>
            <Switch checked={flags.enableWhatsApp} onChange={(v) => setFlags((s) => ({ ...s, enableWhatsApp: v }))} />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border bg-background/50 p-3">
            <div>
              <p className="text-sm font-medium text-foreground">Enable outreach automation</p>
              <p className="text-xs text-muted-foreground">Campaign send-next processing & automation hooks.</p>
            </div>
            <Switch checked={flags.enableOutreachAutomation} onChange={(v) => setFlags((s) => ({ ...s, enableOutreachAutomation: v }))} />
          </div>
        </div>
      </section>
    </div>
  );
}

