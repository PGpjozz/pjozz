"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useFeatureFlags } from "@/components/flags/feature-flags";

import type { LeadAnalysis } from "@/lib/ai/types";
import type { ProposalContent } from "@/lib/ai/types";
import type { LeadApi } from "@/lib/leads/mappers";
import { mergeEnrichment } from "@/lib/leads/mappers";
import type { LeadStatus } from "@/types";

import { LeadScoreBadge } from "./LeadScoreBadge";
import { SERVICE_LABEL } from "./lead-constants";
import { StatusBadge } from "./StatusBadge";

type OutreachRow = {
  id: string;
  type: string;
  metadata: unknown;
  created_at: string;
};

type PipelineRow = {
  id: string;
  lead_id: string;
  stage: string;
  probability: number;
  deal_value: number | null;
  expected_close_date: string | null;
  notes: string | null;
};

const STATUSES: LeadStatus[] = [
  "new",
  "contacted",
  "qualified",
  "meeting",
  "proposal",
  "won",
  "lost",
];

type Props = {
  leadId: string;
  mode: "sheet" | "page";
  onClose?: () => void;
  onUpdated?: () => void;
};

export function LeadDetailView({ leadId, mode, onClose, onUpdated }: Props) {
  const { flags } = useFeatureFlags();
  const [lead, setLead] = useState<LeadApi | null>(null);
  const [outreach, setOutreach] = useState<OutreachRow[]>([]);
  const [pipeline, setPipeline] = useState<PipelineRow | null>(null);
  const [notes, setNotes] = useState("");
  const [emailType, setEmailType] = useState<"initial" | "followup1" | "followup2" | "breakup">("initial");
  const [draft, setDraft] = useState<{ subject: string; body: string; previewText: string } | null>(null);
  const [proposalNotes, setProposalNotes] = useState("");
  const [proposalOpen, setProposalOpen] = useState(false);
  const [proposalContent, setProposalContent] = useState<ProposalContent | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const notesTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    const [lr, or, pr] = await Promise.all([
      fetch(`/api/leads/${leadId}`),
      fetch(`/api/leads/${leadId}/outreach`),
      fetch(`/api/leads/${leadId}/pipeline`),
    ]);
    const lj = (await lr.json()) as { ok: boolean; data?: LeadApi };
    const oj = (await or.json()) as { ok: boolean; data?: OutreachRow[] };
    const pj = (await pr.json()) as { ok: boolean; data?: PipelineRow | null };
    if (lj.ok && lj.data) {
      setLead(lj.data);
      setNotes(lj.data.aiNotes ?? "");
    }
    if (oj.ok && oj.data) setOutreach(oj.data);
    if (pj.ok) setPipeline(pj.data ?? null);
  }, [leadId]);

  useEffect(() => {
    void load();
  }, [load]);

  const analysis = (lead?.enrichmentData as { last_ai_analysis?: LeadAnalysis } | null)?.last_ai_analysis;

  async function patchLead(body: Record<string, unknown>) {
    const res = await fetch(`/api/leads/${leadId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = (await res.json()) as { ok: boolean; data?: LeadApi };
    if (json.ok && json.data) {
      setLead(json.data);
      onUpdated?.();
    }
  }

  function scheduleNotesSave(value: string) {
    if (notesTimer.current) clearTimeout(notesTimer.current);
    notesTimer.current = setTimeout(() => {
      void patchLead({ aiNotes: value });
    }, 700);
  }

  async function reanalyze() {
    if (!flags.enableAi) {
      toast.error("AI is disabled in Settings.");
      return;
    }
    if (!lead) return;
    setBusy("analyze");
    try {
      const res = await fetch("/api/ai/score-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId: lead.id,
          leadData: {
            companyName: lead.companyName,
            contactName: lead.contactName ?? undefined,
            email: lead.email ?? undefined,
            phone: lead.phone ?? undefined,
            website: lead.website ?? undefined,
            industry: lead.industry ?? undefined,
            signals: (lead.enrichmentData as { service_types?: string[] } | null)?.service_types,
          },
        }),
      });
      const json = (await res.json()) as {
        ok: boolean;
        data?: LeadAnalysis;
        cached?: boolean;
        scoringMeta?: { scoredAt: string; fingerprint: string };
      };
      if (!json.ok || !json.data) return;
      if (json.cached) {
        onUpdated?.();
        return;
      }
      const next = mergeEnrichment(lead.enrichmentData, {
        last_ai_analysis: json.data,
        ...(json.scoringMeta
          ? {
              ai_scoring: {
                at: json.scoringMeta.scoredAt,
                fingerprint: json.scoringMeta.fingerprint,
              },
            }
          : {}),
      });
      await patchLead({
        leadScore: json.data.score,
        enrichmentData: next,
      });
    } finally {
      setBusy(null);
    }
  }

  async function generateEmail() {
    if (!flags.enableAi) {
      toast.error("AI is disabled in Settings.");
      return;
    }
    if (!lead) return;
    setBusy("email");
    try {
      const res = await fetch("/api/ai/generate-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lead: { ...lead, contactName: lead.contactName ?? "", email: lead.email ?? "" },
          emailType,
        }),
      });
      const json = (await res.json()) as { ok: boolean; data?: { subject: string; body: string; previewText: string } };
      if (json.ok && json.data) setDraft(json.data);
    } finally {
      setBusy(null);
    }
  }

  async function generateProposalAi() {
    if (!flags.enableAi) {
      toast.error("AI is disabled in Settings.");
      return;
    }
    if (!lead || !proposalNotes.trim()) return;
    setBusy("proposal");
    try {
      const res = await fetch("/api/ai/generate-proposal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lead: { ...lead, contactName: lead.contactName ?? "", email: lead.email ?? "" },
          discoveryNotes: proposalNotes,
          serviceType: lead.serviceType ?? "software",
        }),
      });
      const json = (await res.json()) as { ok: boolean; data?: ProposalContent };
      if (json.ok && json.data) {
        setProposalContent(json.data);
        setProposalOpen(false);
      }
    } finally {
      setBusy(null);
    }
  }

  async function saveProposal() {
    if (!proposalContent) return;
    setBusy("saveProp");
    try {
      await fetch(`/api/leads/${leadId}/proposals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: proposalContent }),
      });
    } finally {
      setBusy(null);
    }
  }

  async function downloadPdf() {
    if (!proposalContent || !lead) return;
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF();
    let y = 12;
    const lines = [
      proposalContent.title,
      "",
      proposalContent.executiveSummary,
      "",
      proposalContent.problemStatement,
      "",
      proposalContent.proposedSolution,
      "",
      proposalContent.nextSteps,
    ].join("\n");
    const parts = doc.splitTextToSize(lines, 190);
    for (const chunk of parts) {
      if (y > 280) {
        doc.addPage();
        y = 12;
      }
      doc.text(chunk, 10, y);
      y += 6;
    }
    doc.save(`${lead.companyName.replace(/\s+/g, "-")}-proposal.pdf`);
  }

  async function sendEmail(kind: "draft" | "proposal") {
    if (!flags.enableResendEmail) {
      toast.error("Email sending is disabled in Settings.");
      return;
    }
    if (!lead?.email?.trim()) {
      toast.error("Add a contact email for this lead before sending.");
      return;
    }
    const subject = kind === "draft" && draft ? draft.subject : proposalContent?.title ?? "Pjozz proposal";
    const html =
      kind === "draft" && draft
        ? `<p>${draft.body.replace(/\n/g, "<br/>")}</p>`
        : proposalContent
          ? `<pre style="font-family:system-ui">${JSON.stringify(proposalContent, null, 2)}</pre>`
          : "";
    if (!html) {
      toast.error(kind === "draft" ? "Generate an email first." : "Generate a proposal first.");
      return;
    }
    setBusy("send");
    try {
      const res = await fetch(`/api/leads/${leadId}/send-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, html }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || data.ok === false) {
        toast.error(data.error ?? (res.statusText || "Send failed"));
        return;
      }
      toast.success("Email sent.");
      void load();
      onUpdated?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Network error");
    } finally {
      setBusy(null);
    }
  }

  async function savePipeline() {
    const p =
      pipeline ??
      ({
        id: "",
        lead_id: leadId,
        stage: "Discovery",
        probability: 20,
        deal_value: null,
        expected_close_date: null,
        notes: null,
      } as PipelineRow);
    await fetch(`/api/leads/${leadId}/pipeline`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        stage: p.stage,
        probability: p.probability,
        dealValue: p.deal_value,
        expectedCloseDate: p.expected_close_date,
        notes: p.notes,
      }),
    });
    void load();
    onUpdated?.();
  }

  if (!lead) {
    const loading = (
      <div className="flex min-h-[40vh] items-center justify-center font-mono text-sm text-muted-foreground">
        Loading lead…
      </div>
    );
    return mode === "sheet" ? <SheetShell onClose={onClose}>{loading}</SheetShell> : loading;
  }

  const inner = (
    <div className="space-y-6 pb-10">
      {mode === "page" ? (
        <div className="mb-4 flex items-center gap-3 text-sm">
          <Link href="/leads" className="text-primary hover:underline">
            ← Leads
          </Link>
        </div>
      ) : (
        <div className="mb-4 flex justify-end">
          <Link href={`/leads/${lead.id}`} className="text-xs text-primary hover:underline">
            Open full page →
          </Link>
        </div>
      )}

      <header className="flex flex-col gap-4 border-b border-border pb-6 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="font-heading text-2xl font-semibold text-foreground">{lead.companyName}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{lead.contactName || "—"}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <LeadScoreBadge score={lead.leadScore} />
            <StatusBadge status={lead.status} />
            <select
              className="pj-input w-auto py-1 text-xs"
              value={lead.status}
              onChange={(e) => void patchLead({ status: e.target.value as LeadStatus })}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <span className="rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-xs text-primary">
              {lead.serviceType ? SERVICE_LABEL[lead.serviceType] ?? lead.serviceType : "Service"}
            </span>
          </div>
        </div>
        <div className="w-full max-w-xs space-y-1">
          <p className="text-xs uppercase text-muted-foreground">Score gauge</p>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${lead.leadScore}%` }}
            />
          </div>
        </div>
      </header>

      <Card title="Contact">
        <div className="grid gap-3 sm:grid-cols-2">
          <CopyField label="Email" value={lead.email} />
          <Field label="Phone" value={lead.phone} />
          <Field label="WhatsApp" value={lead.whatsapp} />
          <div>
            <p className="text-xs uppercase text-muted-foreground">Website</p>
            {lead.website ? (
              <a href={lead.website} target="_blank" rel="noreferrer" className="text-sm text-primary hover:underline">
                {lead.website}
              </a>
            ) : (
              <p className="text-sm text-muted-foreground">—</p>
            )}
          </div>
        </div>
      </Card>

      <Card title="AI analysis">
        {analysis ? (
          <div className="space-y-3 text-sm">
            <p className="text-muted-foreground">{analysis.reasoning}</p>
            <div>
              <p className="text-xs uppercase text-muted-foreground">Suggested approach</p>
              <p>{analysis.suggestedApproach}</p>
            </div>
            <div className="flex flex-wrap gap-1">
              {analysis.serviceMatch.map((t) => (
                <span key={t} className="rounded-md bg-primary/10 px-2 py-0.5 text-xs text-primary">
                  {t}
                </span>
              ))}
            </div>
            {analysis.redFlags?.length ? (
              <ul className="list-inside list-disc text-red-300">
                {analysis.redFlags.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No AI analysis yet. Run scoring from the list or below.</p>
        )}
        <Button className="mt-4" variant="secondary" disabled={busy === "analyze"} onClick={() => void reanalyze()}>
          {busy === "analyze" ? "Analyzing…" : "Re-analyze"}
        </Button>
      </Card>

      <Card title="Outreach history">
        <ul className="space-y-3 border-l border-border pl-4">
          {outreach.length === 0 ? (
            <li className="text-sm text-muted-foreground">No events logged.</li>
          ) : (
            outreach.map((e) => (
              <li key={e.id} className="relative text-sm">
                <span className="absolute -left-[21px] top-1.5 size-2 rounded-full bg-primary" />
                <p className="font-mono text-xs text-primary">{e.type.replace(/_/g, " ")}</p>
                <p className="text-xs text-muted-foreground">{new Date(e.created_at).toLocaleString()}</p>
              </li>
            ))
          )}
        </ul>
      </Card>

      <Card title="AI email generator">
        <div className="flex flex-wrap gap-2">
          {(["initial", "followup1", "followup2", "breakup"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setEmailType(t)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs",
                emailType === t ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"
              )}
            >
              {t}
            </button>
          ))}
        </div>
        <Button className="mt-3" onClick={() => void generateEmail()} disabled={busy === "email"}>
          {busy === "email" ? "Generating…" : "Generate email"}
        </Button>
        {draft ? (
          <div className="mt-4 space-y-2">
            <label className="text-xs uppercase text-muted-foreground">Subject</label>
            <input className="pj-input font-mono text-sm" value={draft.subject} onChange={(e) => setDraft({ ...draft, subject: e.target.value })} />
            <label className="text-xs uppercase text-muted-foreground">Body</label>
            <textarea className="pj-input min-h-[160px] font-mono text-sm" value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} />
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigator.clipboard.writeText(`${draft.subject}\n\n${draft.body}`)}
              >
                Copy
              </Button>
              <Button
                size="sm"
                disabled={busy === "send" || !lead.email?.trim()}
                title={!lead.email?.trim() ? "Add a contact email above" : undefined}
                onClick={() => void sendEmail("draft")}
              >
                {busy === "send" ? "Sending…" : "Send via Resend"}
              </Button>
            </div>
          </div>
        ) : null}
      </Card>

      <Card title="Proposal">
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => setProposalOpen(true)}>
            Generate proposal
          </Button>
          {proposalContent ? (
            <>
              <Button variant="outline" size="sm" onClick={() => void downloadPdf()}>
                Download PDF
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={busy === "send" || !lead.email?.trim()}
                title={!lead.email?.trim() ? "Add a contact email in Contact" : undefined}
                onClick={() => void sendEmail("proposal")}
              >
                {busy === "send" ? "Sending…" : "Send to client"}
              </Button>
              <Button variant="outline" size="sm" onClick={() => void saveProposal()}>
                Save to CRM
              </Button>
            </>
          ) : null}
        </div>
        {proposalContent ? (
          <div className="mt-4 max-h-[420px] space-y-3 overflow-y-auto rounded-lg border border-border bg-[#0A0A0A] p-4 font-mono text-xs leading-relaxed text-muted-foreground">
            <p className="text-lg font-heading text-foreground">{proposalContent.title}</p>
            <p>{proposalContent.executiveSummary}</p>
            <p className="text-primary">{proposalContent.investmentOptions.map((o) => `${o.tier}: R${o.price}`).join(" · ")}</p>
          </div>
        ) : null}
      </Card>

      <Card title="Pipeline">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="text-xs uppercase text-muted-foreground">Stage</label>
            <input
              className="pj-input mt-1 font-mono text-sm"
              value={pipeline?.stage ?? "Discovery"}
              onChange={(e) =>
                setPipeline((p) => ({
                  ...(p ?? {
                    id: "",
                    lead_id: leadId,
                    stage: "Discovery",
                    probability: 20,
                    deal_value: null,
                    expected_close_date: null,
                    notes: null,
                  }),
                  stage: e.target.value,
                }))
              }
            />
          </div>
          <div>
            <label className="text-xs uppercase text-muted-foreground">Deal value (ZAR)</label>
            <input
              type="number"
              className="pj-input mt-1 font-mono text-sm"
              value={pipeline?.deal_value ?? ""}
              onChange={(e) =>
                setPipeline((p) => ({
                  ...(p ?? {
                    id: "",
                    lead_id: leadId,
                    stage: "Discovery",
                    probability: 20,
                    deal_value: null,
                    expected_close_date: null,
                    notes: null,
                  }),
                  deal_value: e.target.value === "" ? null : Number(e.target.value),
                }))
              }
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs uppercase text-muted-foreground">Probability ({pipeline?.probability ?? 20}%)</label>
            <input
              type="range"
              min={0}
              max={100}
              className="mt-2 w-full accent-primary"
              value={pipeline?.probability ?? 20}
              onChange={(e) =>
                setPipeline((p) => ({
                  ...(p ?? {
                    id: "",
                    lead_id: leadId,
                    stage: "Discovery",
                    probability: 20,
                    deal_value: null,
                    expected_close_date: null,
                    notes: null,
                  }),
                  probability: Number(e.target.value),
                }))
              }
            />
          </div>
          <div>
            <label className="text-xs uppercase text-muted-foreground">Expected close</label>
            <input
              type="date"
              className="pj-input mt-1 font-mono text-sm"
              value={pipeline?.expected_close_date?.slice(0, 10) ?? ""}
              onChange={(e) =>
                setPipeline((p) => ({
                  ...(p ?? {
                    id: "",
                    lead_id: leadId,
                    stage: "Discovery",
                    probability: 20,
                    deal_value: null,
                    expected_close_date: null,
                    notes: null,
                  }),
                  expected_close_date: e.target.value || null,
                }))
              }
            />
          </div>
        </div>
        <Button className="mt-4" variant="outline" onClick={() => void savePipeline()}>
          Save pipeline
        </Button>
      </Card>

      <Card title="Notes (auto-saved)">
        <textarea
          className="pj-input min-h-[120px] font-mono text-sm"
          value={notes}
          onChange={(e) => {
            setNotes(e.target.value);
            scheduleNotesSave(e.target.value);
          }}
        />
      </Card>
    </div>
  );

  const shell =
    mode === "sheet" ? (
      <SheetShell onClose={onClose}>{inner}</SheetShell>
    ) : (
      <div className="mx-auto max-w-5xl">{inner}</div>
    );

  return (
    <>
      {shell}
      {proposalOpen ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-border bg-[#0A0A0A] p-6 shadow-2xl">
            <h3 className="font-heading text-lg text-foreground">Discovery notes</h3>
            <textarea
              className="pj-input mt-4 min-h-[160px]"
              placeholder="Call notes, pains, budget, stakeholders…"
              value={proposalNotes}
              onChange={(e) => setProposalNotes(e.target.value)}
            />
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setProposalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => void generateProposalAi()} disabled={busy === "proposal" || !proposalNotes.trim()}>
                {busy === "proposal" ? "Generating…" : "Run AI"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function SheetShell({ children, onClose }: { children: React.ReactNode; onClose?: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button type="button" className="absolute inset-0 bg-black/70 backdrop-blur-[1px]" aria-label="Close" onClick={onClose} />
      <div className="relative h-full w-full max-w-2xl overflow-y-auto border-l border-border bg-[#0A0A0A] p-6 shadow-2xl">
        <div className="mb-4 flex justify-end">
          <button type="button" className="text-sm text-muted-foreground hover:text-foreground" onClick={onClose}>
            Close ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-card/20 p-5">
      <h3 className="mb-3 font-heading text-sm font-semibold uppercase tracking-wide text-primary">{title}</h3>
      {children}
    </section>
  );
}

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <p className="text-xs uppercase text-muted-foreground">{label}</p>
      <p className="text-sm text-foreground">{value ?? "—"}</p>
    </div>
  );
}

function CopyField({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <p className="text-xs uppercase text-muted-foreground">{label}</p>
      {value ? (
        <button
          type="button"
          className="text-left text-sm text-primary hover:underline"
          onClick={() => void navigator.clipboard.writeText(value)}
        >
          {value} <span className="text-xs text-muted-foreground">(copy)</span>
        </button>
      ) : (
        <p className="text-sm text-muted-foreground">—</p>
      )}
    </div>
  );
}
