"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { LeadApi } from "@/lib/leads/mappers";
import type { ProposalContent } from "@/lib/ai/types";
import type { LeadServiceType } from "@/types";
import { SERVICE_LABEL } from "@/components/leads/lead-constants";
import { proposalContentOutputSchema } from "@/lib/ai/schemas";
import { PRICING_TEMPLATE_REFERENCE } from "@/lib/proposals/pricing-templates";
import { SECTION_LABELS } from "@/lib/proposals/stream-sections";
import { useFeatureFlags } from "@/components/flags/feature-flags";

const BUDGETS = ["Under R50k", "R50k–R150k", "R150k–R500k", "R500k+"] as const;
const TIMELINES = ["ASAP", "1–3 months", "3–6 months", "Flexible"] as const;
const SERVICES: LeadServiceType[] = ["webapp", "mobileapp", "automation", "network", "security_cam", "software"];

const emptyDoc = (): ProposalContent => ({
  title: "",
  executiveSummary: "",
  problemStatement: "",
  proposedSolution: "",
  deliverables: [],
  timeline: [],
  investmentOptions: [],
  whyPjozz: "",
  nextSteps: "",
});

export function ProposalNewClient() {
  const router = useRouter();
  const sp = useSearchParams();
  const existingId = sp.get("id");
  const { flags } = useFeatureFlags();

  const [step, setStep] = useState(1);
  const [proposalId, setProposalId] = useState<string | null>(null);
  const [, setLeadId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [pool, setPool] = useState<LeadApi[]>([]);
  const [quick, setQuick] = useState({ company: "", name: "", email: "", service: "webapp" as LeadServiceType });
  const [discoveryNotes, setDiscoveryNotes] = useState("");
  const [serviceType, setServiceType] = useState<LeadServiceType>("webapp");
  const [budgetRange, setBudgetRange] = useState<string>(BUDGETS[0]!);
  const [timelinePreference, setTimelinePreference] = useState<string>(TIMELINES[0]!);
  const [specialRequirements, setSpecialRequirements] = useState("");
  const [streamLog, setStreamLog] = useState<Record<string, unknown>>({});
  const [doc, setDoc] = useState<ProposalContent | null>(null);
  const [genBusy, setGenBusy] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);

  const pricingRef = useMemo(
    () => PRICING_TEMPLATE_REFERENCE.map((t) => `${t.label}: R${t.minZar.toLocaleString()}–R${t.maxZar.toLocaleString()}`).join("\n"),
    []
  );

  const loadPool = useCallback(async () => {
    const qs = search.trim() ? `search=${encodeURIComponent(search.trim())}&` : "";
    const res = await fetch(`/api/leads?${qs}pageSize=30`);
    const json = (await res.json()) as { ok: boolean; data?: { leads: LeadApi[] } };
    if (json.ok && json.data) setPool(json.data.leads);
  }, [search]);

  useEffect(() => {
    void loadPool();
  }, [loadPool]);

  useEffect(() => {
    if (!existingId) return;
    (async () => {
      const res = await fetch(`/api/proposals/${existingId}`);
      const json = (await res.json()) as { ok: boolean; data?: { proposal: { id: string; lead_id: string | null }; document: ProposalContent | null } };
      if (!json.ok || !json.data) return;
      setProposalId(json.data.proposal.id);
      setLeadId(json.data.proposal.lead_id);
      if (json.data.document) setDoc(json.data.document);
      setStep(json.data.document?.title ? 4 : 2);
    })();
  }, [existingId]);

  useEffect(() => {
    const fromLead = sp.get("leadId");
    if (!fromLead || existingId) return;
    let cancelled = false;
    (async () => {
      try {
        const listRes = await fetch(`/api/proposals?leadId=${encodeURIComponent(fromLead)}`);
        const listJson = (await listRes.json()) as {
          ok: boolean;
          data?: { proposals: Array<{ id: string; status: string; lead_id?: string | null }> };
        };
        const existing =
          listJson.ok && listJson.data
            ? listJson.data.proposals.find((p) => p.status === "draft") ?? listJson.data.proposals[0]
            : null;
        if (cancelled) return;
        if (existing) {
          setProposalId(existing.id);
          setLeadId(fromLead);
          const res = await fetch(`/api/proposals/${existing.id}`);
          const json = (await res.json()) as {
            ok: boolean;
            data?: { document: ProposalContent | null };
          };
          if (json.ok && json.data?.document) setDoc(json.data.document);
          setStep(json.data?.document?.title ? 4 : 2);
          toast.message("Opened existing proposal for this lead");
          return;
        }
        await createProposalForLead(fromLead);
        if (!cancelled) {
          toast.success("Proposal draft started for this lead");
          setStep(2);
        }
      } catch (e) {
        if (!cancelled) toast.error(e instanceof Error ? e.message : "Could not start proposal");
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once when leadId is present
  }, [sp, existingId]);

  async function createProposalForLead(lid: string) {
    const res = await fetch("/api/proposals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leadId: lid }),
    });
    const json = (await res.json()) as { ok: boolean; data?: { proposal: { id: string } }; error?: string };
    if (!json.ok || !json.data) throw new Error(json.error ?? "Failed");
    setProposalId(json.data.proposal.id);
    setLeadId(lid);
  }

  async function quickCreateLead() {
    const res = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        companyName: quick.company,
        contactName: quick.name || "Contact",
        email: quick.email,
        serviceTypes: [quick.service],
        skipAi: true,
      }),
    });
    const json = (await res.json()) as { ok: boolean; data?: LeadApi; error?: string };
    if (!json.ok || !json.data) throw new Error(json.error ?? "Lead create failed");
    await createProposalForLead(json.data.id);
    toast.success("Lead created");
    setStep(2);
  }

  async function saveDiscovery() {
    if (!proposalId) return;
    if (!discoveryNotes.trim()) {
      toast.error("Discovery notes required");
      return;
    }
    const res = await fetch(`/api/proposals/${proposalId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        discoveryJson: {
          discoveryNotes: discoveryNotes.trim(),
          serviceType,
          budgetRange,
          timelinePreference,
          specialRequirements: specialRequirements.trim() || undefined,
        },
      }),
    });
    const json = (await res.json()) as { ok: boolean; error?: string };
    if (!json.ok) throw new Error(json.error ?? "Save failed");
    toast.success("Discovery saved");
    setStep(3);
  }

  async function runStream() {
    if (!flags.enableAi) {
      toast.error("AI is disabled in Settings.");
      return;
    }
    if (!proposalId) return;
    setGenBusy(true);
    setStreamLog({});
    setDoc(emptyDoc());
    try {
      const res = await fetch(`/api/proposals/${proposalId}/stream-generate`, { method: "POST" });
      if (!res.ok || !res.body) throw new Error("Stream failed");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const parts = buf.split("\n\n");
        buf = parts.pop() ?? "";
        for (const block of parts) {
          for (const line of block.split("\n")) {
            if (!line.startsWith("data: ")) continue;
            try {
              const evt = JSON.parse(line.slice(6)) as Record<string, unknown>;
              if (evt.type === "section" && typeof evt.key === "string") {
                const sectionKey = evt.key;
                setStreamLog((s) => ({ ...s, [sectionKey]: true }));
                setDoc((prev) => {
                  const base = prev ?? emptyDoc();
                  const k = sectionKey as keyof ProposalContent;
                  return { ...base, [k]: evt.data } as ProposalContent;
                });
              }
              if (evt.type === "done" && evt.content) {
                const c = proposalContentOutputSchema.safeParse(evt.content);
                if (c.success) setDoc(c.data);
              }
              if (evt.type === "error") throw new Error(String(evt.message));
            } catch {
              /* partial */
            }
          }
        }
      }
      const res2 = await fetch(`/api/proposals/${proposalId}`);
      const j2 = (await res2.json()) as { ok: boolean; data?: { document: ProposalContent | null } };
      if (j2.ok && j2.data?.document) setDoc(j2.data.document);
      setStep(4);
      toast.success("Proposal generated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setGenBusy(false);
    }
  }

  async function saveDocument() {
    if (!proposalId || !doc) return;
    const res = await fetch(`/api/proposals/${proposalId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ document: doc }),
    });
    const json = (await res.json()) as { ok: boolean; error?: string };
    if (!json.ok) throw new Error(json.error ?? "Save failed");
    toast.success("Saved");
  }

  async function sendProposal() {
    if (!flags.enableResendEmail) {
      toast.error("Email sending is disabled in Settings.");
      return;
    }
    if (!proposalId) return;
    await saveDocument();
    const res = await fetch(`/api/proposals/${proposalId}/send`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
    const json = (await res.json()) as { ok: boolean; data?: { shareUrl: string }; error?: string };
    if (!json.ok) throw new Error(json.error ?? "Send failed");
    setShareUrl(json.data?.shareUrl ?? null);
    toast.success("Proposal sent");
  }

  async function createInvoiceFromProposal() {
    if (!proposalId) return;
    try {
      await saveDocument();
      const res = await fetch(`/api/proposals/${proposalId}/create-invoice`, { method: "POST" });
      const json = (await res.json()) as {
        ok: boolean;
        data?: { invoiceId: string | null; alreadyHadInvoice?: boolean };
        error?: string;
      };
      if (!json.ok || !json.data?.invoiceId) throw new Error(json.error ?? "Could not create invoice");
      toast.success(json.data.alreadyHadInvoice ? "Opening existing invoice" : "Invoice draft created");
      router.push(`/billing/invoices/${json.data.invoiceId}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Invoice create failed");
    }
  }

  async function improve(section: keyof ProposalContent) {
    if (!flags.enableAi) {
      toast.error("AI is disabled in Settings.");
      return;
    }
    if (!proposalId || !doc) return;
    const res = await fetch("/api/ai/improve-proposal-section", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        section,
        proposal: doc,
      }),
    });
    const json = (await res.json()) as { ok: boolean; data?: { text: string }; error?: string };
    if (!json.ok || !json.data) {
      toast.error(json.error ?? "Improve failed");
      return;
    }
    setDoc({ ...doc, [section]: json.data.text });
    toast.success("Section updated");
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 pb-16">
      <div>
        <Link href="/proposals" className="text-xs text-primary hover:underline">
          ← Proposals
        </Link>
        <h1 className="mt-2 font-heading text-2xl font-semibold text-foreground">New proposal</h1>
      </div>

      <div className="flex flex-wrap gap-2 font-mono text-xs">
        {[1, 2, 3, 4, 5].map((n) => (
          <span key={n} className={cn("rounded-full px-3 py-1", step === n ? "bg-primary text-black" : "bg-muted text-muted-foreground")}>
            {n}
          </span>
        ))}
      </div>

      {step === 1 ? (
        <div className="space-y-4 rounded-xl border border-border bg-card/30 p-4">
          <h2 className="font-heading text-sm font-semibold text-primary">1 · Select lead</h2>
          <input
            className="pj-input w-full font-mono text-sm"
            placeholder="Search companies…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="max-h-48 space-y-1 overflow-y-auto rounded border border-border p-2">
            {pool.map((l) => (
              <button
                key={l.id}
                type="button"
                className="flex w-full justify-between rounded px-2 py-1 text-left text-sm hover:bg-muted"
                onClick={() => void createProposalForLead(l.id).then(() => setStep(2))}
              >
                <span>{l.companyName}</span>
                <span className="text-muted-foreground">{l.email}</span>
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">Or quick create:</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <input className="pj-input font-mono text-sm" placeholder="Company" value={quick.company} onChange={(e) => setQuick({ ...quick, company: e.target.value })} />
            <input className="pj-input font-mono text-sm" placeholder="Contact name" value={quick.name} onChange={(e) => setQuick({ ...quick, name: e.target.value })} />
            <input className="pj-input font-mono text-sm" placeholder="Email" value={quick.email} onChange={(e) => setQuick({ ...quick, email: e.target.value })} />
            <select className="pj-input font-mono text-sm" value={quick.service} onChange={(e) => setQuick({ ...quick, service: e.target.value as LeadServiceType })}>
              {SERVICES.map((s) => (
                <option key={s} value={s}>
                  {SERVICE_LABEL[s] ?? s}
                </option>
              ))}
            </select>
          </div>
          <Button type="button" onClick={() => void quickCreateLead().catch((e) => toast.error(String(e)))}>
            Create lead & continue
          </Button>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="space-y-4 rounded-xl border border-border bg-card/30 p-4">
          <h2 className="font-heading text-sm font-semibold text-primary">2 · Discovery</h2>
          <textarea
            className="pj-input min-h-[140px] w-full font-mono text-sm"
            placeholder="Paste discovery notes, transcript, or bullets…"
            value={discoveryNotes}
            onChange={(e) => setDiscoveryNotes(e.target.value)}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs uppercase text-muted-foreground">Service type</label>
              <select className="pj-input w-full font-mono text-sm" value={serviceType} onChange={(e) => setServiceType(e.target.value as LeadServiceType)}>
                {SERVICES.map((s) => (
                  <option key={s} value={s}>
                    {SERVICE_LABEL[s] ?? s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs uppercase text-muted-foreground">Budget (optional)</label>
              <select className="pj-input w-full font-mono text-sm" value={budgetRange} onChange={(e) => setBudgetRange(e.target.value)}>
                {BUDGETS.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs uppercase text-muted-foreground">Timeline</label>
              <select className="pj-input w-full font-mono text-sm" value={timelinePreference} onChange={(e) => setTimelinePreference(e.target.value)}>
                {TIMELINES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs uppercase text-muted-foreground">Special requirements</label>
            <textarea className="pj-input min-h-[72px] w-full font-mono text-sm" value={specialRequirements} onChange={(e) => setSpecialRequirements(e.target.value)} />
          </div>
          <p className="text-[10px] text-muted-foreground">Pricing reference for AI: {pricingRef.slice(0, 200)}…</p>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setStep(1)}>
              Back
            </Button>
            <Button onClick={() => void saveDiscovery().catch((e) => toast.error(String(e)))}>Continue</Button>
          </div>
        </div>
      ) : null}

      {step === 3 ? (
        <div className="space-y-4 rounded-xl border border-border bg-card/30 p-4">
          <h2 className="font-heading text-sm font-semibold text-primary">3 · AI generation</h2>
          <div className="grid gap-2 font-mono text-xs">
            {Object.entries(SECTION_LABELS).map(([key, label]) => (
              <div key={key} className={cn("rounded border border-border px-2 py-2", streamLog[key] ? "border-primary/50 bg-primary/5" : "animate-pulse bg-muted/20")}>
                {label}
                {streamLog[key] ? " ✓" : " …"}
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setStep(2)}>
              Back
            </Button>
            <Button disabled={genBusy || !flags.enableAi} title={!flags.enableAi ? "AI is disabled in Settings" : "Generate proposal"} onClick={() => void runStream()}>
              {genBusy ? "Generating…" : "Generate proposal"}
            </Button>
          </div>
        </div>
      ) : null}

      {step === 4 && doc ? (
        <div className="space-y-6 rounded-xl border border-border bg-card/30 p-4">
          <h2 className="font-heading text-sm font-semibold text-primary">4 · Review & edit</h2>
          <TextBlock label="Title" value={doc.title} onChange={(v) => setDoc({ ...doc, title: v })} improveDisabled />
          <TextBlock
            label="Executive summary"
            value={doc.executiveSummary}
            onChange={(v) => setDoc({ ...doc, executiveSummary: v })}
            onImprove={flags.enableAi ? () => void improve("executiveSummary") : undefined}
            improveDisabled={!flags.enableAi}
          />
          <TextBlock
            label="Problem"
            value={doc.problemStatement}
            onChange={(v) => setDoc({ ...doc, problemStatement: v })}
            onImprove={flags.enableAi ? () => void improve("problemStatement") : undefined}
            improveDisabled={!flags.enableAi}
          />
          <TextBlock
            label="Solution"
            value={doc.proposedSolution}
            onChange={(v) => setDoc({ ...doc, proposedSolution: v })}
            onImprove={flags.enableAi ? () => void improve("proposedSolution") : undefined}
            improveDisabled={!flags.enableAi}
          />
          <TextBlock
            label="Why Pjozz"
            value={doc.whyPjozz}
            onChange={(v) => setDoc({ ...doc, whyPjozz: v })}
            onImprove={flags.enableAi ? () => void improve("whyPjozz") : undefined}
            improveDisabled={!flags.enableAi}
          />
          <TextBlock
            label="Next steps"
            value={doc.nextSteps}
            onChange={(v) => setDoc({ ...doc, nextSteps: v })}
            onImprove={flags.enableAi ? () => void improve("nextSteps") : undefined}
            improveDisabled={!flags.enableAi}
          />
          <DeliverablesEditor doc={doc} setDoc={setDoc} />
          <TimelineEditor doc={doc} setDoc={setDoc} />
          <PricingEditor doc={doc} setDoc={setDoc} />
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setStep(3)}>
              Back
            </Button>
            <Button variant="outline" onClick={() => void saveDocument().catch((e) => toast.error(String(e)))}>
              Save
            </Button>
            <Button onClick={() => setStep(5)}>Continue to send</Button>
          </div>
        </div>
      ) : null}

      {step === 5 && doc && proposalId ? (
        <div className="space-y-4 rounded-xl border border-border bg-card/30 p-4">
          <h2 className="font-heading text-sm font-semibold text-primary">5 · Send</h2>
          <div className="rounded-lg border border-border bg-background/50 p-4 text-sm text-muted-foreground">
            <p className="font-semibold text-foreground">{doc.title}</p>
            <p className="mt-2">Preview matches the client-facing page after you send.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              disabled={!flags.enableResendEmail}
              title={!flags.enableResendEmail ? "Email sending is disabled in Settings" : "Send via email"}
              onClick={() => void sendProposal().catch((e) => toast.error(String(e)))}
            >
              Send via email
            </Button>
            <Button
              variant="outline"
              type="button"
              onClick={() => {
                if (shareUrl) void navigator.clipboard.writeText(shareUrl);
                toast.message(shareUrl ? "Link copied" : "Send first to create link");
              }}
            >
              Copy share link
            </Button>
            <a className={cn("inline-flex items-center", buttonVariants({ variant: "secondary" }))} href={`/api/proposals/${proposalId}/pdf`} target="_blank" rel="noreferrer">
              Proposal PDF
            </a>
            <a className={cn("inline-flex items-center", buttonVariants({ variant: "outline" }))} href={`/api/proposals/${proposalId}/quote-pdf`} target="_blank" rel="noreferrer">
              Quote PDF
            </a>
            <Button
              variant="outline"
              type="button"
              onClick={() => void createInvoiceFromProposal()}
            >
              Create invoice
            </Button>
            <Button variant="ghost" onClick={() => router.push("/proposals")}>
              Done
            </Button>
          </div>
          {shareUrl ? <p className="break-all font-mono text-xs text-primary">{shareUrl}</p> : null}
        </div>
      ) : null}
    </div>
  );
}

function TextBlock({
  label,
  value,
  onChange,
  onImprove,
  improveDisabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onImprove?: () => void;
  improveDisabled?: boolean;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-2">
        <label className="text-xs uppercase text-muted-foreground">{label}</label>
        {!improveDisabled && onImprove ? (
          <button type="button" className="text-[10px] text-primary hover:underline" onClick={onImprove} disabled={!onImprove}>
            Improve with AI
          </button>
        ) : null}
      </div>
      <textarea className="pj-input min-h-[80px] w-full font-mono text-xs" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function DeliverablesEditor({ doc, setDoc }: { doc: ProposalContent; setDoc: (d: ProposalContent) => void }) {
  return (
    <div>
      <label className="mb-2 block text-xs uppercase text-muted-foreground">Deliverables</label>
      <div className="space-y-2">
        {doc.deliverables.map((row, i) => (
          <div key={i} className="flex flex-col gap-2 rounded border border-border p-2 sm:flex-row sm:items-start">
            <div className="grid flex-1 gap-2 sm:grid-cols-2">
              <input
                className="pj-input font-mono text-xs"
                placeholder="Item"
                value={row.item}
                onChange={(e) => {
                  const next = [...doc.deliverables];
                  next[i] = { ...row, item: e.target.value };
                  setDoc({ ...doc, deliverables: next });
                }}
              />
              <input
                className="pj-input font-mono text-xs"
                placeholder="Description"
                value={row.description}
                onChange={(e) => {
                  const next = [...doc.deliverables];
                  next[i] = { ...row, description: e.target.value };
                  setDoc({ ...doc, deliverables: next });
                }}
              />
            </div>
            <label className="flex shrink-0 items-center gap-2 font-mono text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={row.included}
                onChange={(e) => {
                  const next = [...doc.deliverables];
                  next[i] = { ...row, included: e.target.checked };
                  setDoc({ ...doc, deliverables: next });
                }}
              />
              In scope
            </label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="shrink-0 text-destructive hover:text-destructive"
              onClick={() => setDoc({ ...doc, deliverables: doc.deliverables.filter((_, j) => j !== i) })}
            >
              Remove
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            setDoc({
              ...doc,
              deliverables: [...doc.deliverables, { item: "", description: "", included: true }],
            })
          }
        >
          Add deliverable
        </Button>
      </div>
    </div>
  );
}

function TimelineEditor({ doc, setDoc }: { doc: ProposalContent; setDoc: (d: ProposalContent) => void }) {
  return (
    <div>
      <label className="mb-2 block text-xs uppercase text-muted-foreground">Timeline phases</label>
      <div className="space-y-2">
        {doc.timeline.map((row, i) => (
          <div key={i} className="grid gap-2 rounded border border-border p-2 sm:grid-cols-[1fr_1fr_2fr_auto] sm:items-center">
            <input
              className="pj-input font-mono text-xs"
              placeholder="Phase"
              value={row.phase}
              onChange={(e) => {
                const next = [...doc.timeline];
                next[i] = { ...row, phase: e.target.value };
                setDoc({ ...doc, timeline: next });
              }}
            />
            <input
              className="pj-input font-mono text-xs"
              placeholder="Duration"
              value={row.duration}
              onChange={(e) => {
                const next = [...doc.timeline];
                next[i] = { ...row, duration: e.target.value };
                setDoc({ ...doc, timeline: next });
              }}
            />
            <input
              className="pj-input font-mono text-xs"
              placeholder="Description"
              value={row.description}
              onChange={(e) => {
                const next = [...doc.timeline];
                next[i] = { ...row, description: e.target.value };
                setDoc({ ...doc, timeline: next });
              }}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive sm:justify-self-end"
              onClick={() => setDoc({ ...doc, timeline: doc.timeline.filter((_, j) => j !== i) })}
            >
              Remove
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            setDoc({
              ...doc,
              timeline: [...doc.timeline, { phase: "", duration: "", description: "" }],
            })
          }
        >
          Add phase
        </Button>
      </div>
    </div>
  );
}

function PricingEditor({ doc, setDoc }: { doc: ProposalContent; setDoc: (d: ProposalContent) => void }) {
  return (
    <div>
      <label className="mb-2 block text-xs uppercase text-muted-foreground">Pricing tiers (ZAR)</label>
      <div className="space-y-2">
        {doc.investmentOptions.map((row, i) => (
          <div key={i} className="grid gap-2 rounded border border-border p-2 sm:grid-cols-[1fr_1fr_minmax(100px,120px)_auto] sm:items-center">
            <input className="pj-input font-mono text-xs" value={row.tier} onChange={(e) => {
              const next = [...doc.investmentOptions];
              next[i] = { ...row, tier: e.target.value };
              setDoc({ ...doc, investmentOptions: next });
            }} />
            <input className="pj-input font-mono text-xs" value={row.description} onChange={(e) => {
              const next = [...doc.investmentOptions];
              next[i] = { ...row, description: e.target.value };
              setDoc({ ...doc, investmentOptions: next });
            }} />
            <input
              className="pj-input font-mono text-xs"
              type="number"
              value={row.price}
              onChange={(e) => {
                const next = [...doc.investmentOptions];
                next[i] = { ...row, price: Number(e.target.value) || 0 };
                setDoc({ ...doc, investmentOptions: next });
              }}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive sm:justify-self-end"
              onClick={() => setDoc({ ...doc, investmentOptions: doc.investmentOptions.filter((_, j) => j !== i) })}
            >
              Remove
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setDoc({ ...doc, investmentOptions: [...doc.investmentOptions, { tier: "Option", price: 0, description: "", features: [] }] })}
        >
          Add tier
        </Button>
      </div>
    </div>
  );
}
