"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Download, FileText } from "lucide-react";
import { toast } from "sonner";

import { BrandLogo } from "@/components/brand/brand-logo";
import { Button } from "@/components/ui/button";
import type { ProposalContent } from "@/lib/ai/types";
import type { Tables } from "@/lib/db/supabase";
import { cn } from "@/lib/utils";

type ProposalDefaults = {
  currency: string;
  template: { sections: Array<{ key: string; title: string; enabled: boolean; defaultText?: string }> };
};

export function PublicProposalClient({
  proposal,
  document: proposalDoc,
  token,
  interactionLocked = false,
  lockReason = null,
}: {
  proposal: Tables<"proposals">;
  document: ProposalContent;
  token: string;
  interactionLocked?: boolean;
  lockReason?: string | null;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [showChanges, setShowChanges] = useState(false);
  const [defaults, setDefaults] = useState<ProposalDefaults | null>(null);
  const [accepted, setAccepted] = useState(proposal.status === "accepted");
  const [invoiceId, setInvoiceId] = useState<string | null>(null);
  const [changesSent, setChangesSent] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/settings/proposals.defaults", { cache: "no-store" });
        const json = (await res.json()) as { ok: boolean; data?: { value: ProposalDefaults } };
        if (json.ok && json.data?.value) setDefaults(json.data.value);
      } catch {
        /* ignore */
      }
    })();
  }, []);

  const sectionMeta = useMemo(() => {
    const fallback: ProposalDefaults["template"]["sections"] = [
      { key: "executiveSummary", title: "Executive summary", enabled: true },
      { key: "problemStatement", title: "The challenge", enabled: true },
      { key: "proposedSolution", title: "Our approach", enabled: true },
      { key: "deliverables", title: "Deliverables", enabled: true },
      { key: "timeline", title: "Timeline", enabled: true },
      { key: "investmentOptions", title: "Investment", enabled: true },
      { key: "whyPjozz", title: "Why Pjozz", enabled: true },
      { key: "nextSteps", title: "Next steps", enabled: true },
    ];
    const list = defaults?.template?.sections?.length ? defaults.template.sections : fallback;
    return list.filter((s) => s.enabled !== false);
  }, [defaults]);

  const currency = defaults?.currency ?? (proposal.currency ?? "ZAR");
  const canAct = !accepted && !interactionLocked;
  const pdfHref = `/api/proposals/${proposal.id}/pdf?token=${encodeURIComponent(token)}`;
  const quotePdfHref = `/api/proposals/${proposal.id}/quote-pdf?token=${encodeURIComponent(token)}`;

  async function accept() {
    if (!canAct) return;
    setBusy("accept");
    try {
      const res = await fetch(`/api/proposals/${proposal.id}/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const json = (await res.json()) as {
        ok: boolean;
        error?: string;
        data?: { invoiceId?: string | null; invoiceError?: string | null; alreadyAccepted?: boolean };
      };
      if (!json.ok) throw new Error(json.error ?? "Failed");
      setAccepted(true);
      if (json.data?.invoiceId) setInvoiceId(json.data.invoiceId);
      if (json.data?.invoiceError) {
        toast.success("Proposal accepted. Invoice will be prepared by the team.");
      } else if (json.data?.invoiceId) {
        toast.success("Thank you — proposal accepted. An invoice draft was created.");
      } else {
        toast.success("Thank you — proposal accepted.");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error");
    } finally {
      setBusy(null);
    }
  }

  async function requestChanges() {
    if (!canAct) return;
    if (!comment.trim()) {
      toast.error("Please describe the changes you need.");
      return;
    }
    setBusy("changes");
    try {
      const res = await fetch(`/api/proposals/${proposal.id}/request-changes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, message: comment.trim() }),
      });
      const json = (await res.json()) as { ok: boolean; error?: string };
      if (!json.ok) throw new Error(json.error ?? "Failed");
      toast.success("Your feedback was sent to Pjozz.");
      setShowChanges(false);
      setComment("");
      setChangesSent(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="min-h-screen bg-[#fafafa] text-[#1a1a1a]">
      <header className="sticky top-0 z-40 border-b border-black/10 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link href="/" className="transition-opacity hover:opacity-80">
            <BrandLogo href={null} size="md" showWordmark tone="light" />
          </Link>
          <div className="flex items-center gap-3">
            <a
              href={pdfHref}
              className="hidden items-center gap-1.5 text-sm font-medium text-zinc-600 underline-offset-4 hover:text-zinc-900 hover:underline sm:inline-flex"
              target="_blank"
              rel="noreferrer"
            >
              <Download className="h-3.5 w-3.5" aria-hidden />
              PDF
            </a>
            <Link
              href="/client"
              className="text-sm font-medium text-zinc-600 underline-offset-4 hover:text-zinc-900 hover:underline"
            >
              Client hub
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 pb-28 pt-8 sm:px-6 sm:pb-16 sm:pt-10">
        {interactionLocked && lockReason ? (
          <div
            role="status"
            className="mb-8 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
          >
            <p className="font-semibold">This proposal is read-only</p>
            <p className="mt-1 text-amber-900/80">{lockReason}</p>
            <Link href="/contact" className="mt-2 inline-block font-medium underline underline-offset-2">
              Contact Pjozz
            </Link>
          </div>
        ) : null}

        {accepted ? (
          <div
            role="status"
            className="mb-8 flex gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-950"
          >
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" aria-hidden />
            <div>
              <p className="font-semibold">Proposal accepted — thank you</p>
              <p className="mt-1 text-emerald-900/80">
                We&apos;ve notified the Pjozz team. Expect invoice and kickoff next steps shortly
                {invoiceId ? " (invoice draft is ready on our side)." : "."}
              </p>
            </div>
          </div>
        ) : null}

        {changesSent && !accepted ? (
          <div
            role="status"
            className="mb-8 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-950"
          >
            Feedback received — we&apos;ll revise and send an updated link when ready.
          </div>
        ) : null}

        <h1 className="font-serif text-3xl font-semibold text-zinc-900 sm:text-4xl">{proposalDoc.title}</h1>
        <p className="mt-2 text-sm text-zinc-500">Prepared for your review · {currency} pricing</p>

        <div className="mt-6 flex flex-wrap gap-2">
          <a
            href={pdfHref}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-800 shadow-sm hover:bg-zinc-50"
          >
            <Download className="h-4 w-4" aria-hidden />
            Download PDF
          </a>
          <a
            href={quotePdfHref}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-800 shadow-sm hover:bg-zinc-50"
          >
            <FileText className="h-4 w-4" aria-hidden />
            Quote sheet
          </a>
        </div>

        <article className="mt-10 space-y-10 text-[15px] leading-relaxed">
          {sectionMeta.map((s) => {
            if (s.key === "executiveSummary")
              return <Section key={s.key} title={s.title} body={proposalDoc.executiveSummary} />;
            if (s.key === "problemStatement")
              return <Section key={s.key} title={s.title} body={proposalDoc.problemStatement} />;
            if (s.key === "proposedSolution")
              return <Section key={s.key} title={s.title} body={proposalDoc.proposedSolution} />;
            if (s.key === "whyPjozz") return <Section key={s.key} title={s.title} body={proposalDoc.whyPjozz} />;
            if (s.key === "nextSteps") return <Section key={s.key} title={s.title} body={proposalDoc.nextSteps} />;
            if (s.key === "deliverables") {
              return (
                <section key={s.key}>
                  <h2 className="border-b border-zinc-200 pb-2 font-semibold text-zinc-900">{s.title}</h2>
                  <ul className="mt-4 list-disc space-y-2 pl-5">
                    {proposalDoc.deliverables.map((d, i) => (
                      <li key={i}>
                        <strong>{d.item}</strong> — {d.description}
                      </li>
                    ))}
                  </ul>
                </section>
              );
            }
            if (s.key === "timeline") {
              return (
                <section key={s.key}>
                  <h2 className="border-b border-zinc-200 pb-2 font-semibold text-zinc-900">{s.title}</h2>
                  <div className="mt-4 space-y-3">
                    {proposalDoc.timeline.map((t, i) => (
                      <div key={i} className="rounded-lg border border-zinc-200 bg-white p-3">
                        <p className="font-medium text-zinc-900">
                          {t.phase} <span className="text-zinc-500">({t.duration})</span>
                        </p>
                        <p className="mt-1 text-zinc-600">{t.description}</p>
                      </div>
                    ))}
                  </div>
                </section>
              );
            }
            if (s.key === "investmentOptions") {
              return (
                <section key={s.key}>
                  <h2 className="border-b border-zinc-200 pb-2 font-semibold text-zinc-900">{s.title}</h2>
                  <div className="mt-4 space-y-4">
                    {proposalDoc.investmentOptions.map((o, i) => (
                      <div key={i} className="rounded-lg border border-zinc-200 bg-white p-4">
                        <p className="text-lg font-semibold text-[#00a67e]">
                          {currency} {o.price.toLocaleString("en-ZA")}
                        </p>
                        <p className="font-medium text-zinc-900">{o.tier}</p>
                        <p className="mt-1 text-zinc-600">{o.description}</p>
                      </div>
                    ))}
                  </div>
                </section>
              );
            }
            return null;
          })}
        </article>

        <div className="mt-12 hidden flex-col gap-3 border-t border-zinc-200 pt-8 sm:flex sm:flex-row sm:items-center">
          {canAct ? (
            <>
              <Button
                className="bg-[#00a67e] text-black hover:bg-[#00c896]"
                disabled={busy !== null}
                onClick={() => void accept()}
              >
                {busy === "accept" ? "Submitting…" : "Accept proposal"}
              </Button>
              <Button variant="outline" onClick={() => setShowChanges((s) => !s)}>
                Request changes
              </Button>
            </>
          ) : null}
        </div>

        {showChanges && canAct ? (
          <div className="mt-6 rounded-xl border border-zinc-200 bg-white p-4">
            <label htmlFor="proposal-changes" className="mb-2 block text-xs font-medium uppercase text-zinc-500">
              What should we adjust?
            </label>
            <textarea
              id="proposal-changes"
              className="w-full rounded-lg border border-zinc-300 p-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00a67e]/40"
              rows={4}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
            <Button className="mt-3" variant="secondary" disabled={busy !== null} onClick={() => void requestChanges()}>
              {busy === "changes" ? "Sending…" : "Send feedback"}
            </Button>
          </div>
        ) : null}
      </main>

      {/* Mobile sticky action bar */}
      {canAct ? (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-200 bg-white/95 p-3 backdrop-blur sm:hidden">
          <div className="mx-auto flex max-w-3xl gap-2">
            <Button
              className="flex-1 bg-[#00a67e] text-black hover:bg-[#00c896]"
              disabled={busy !== null}
              onClick={() => void accept()}
            >
              {busy === "accept" ? "…" : "Accept"}
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                setShowChanges(true);
                window.document.getElementById("proposal-changes")?.scrollIntoView({ behavior: "smooth", block: "center" });
              }}
            >
              Changes
            </Button>
          </div>
        </div>
      ) : null}

      {accepted ? (
        <div className={cn("fixed inset-x-0 bottom-0 z-40 border-t border-emerald-200 bg-emerald-50 p-3 sm:hidden")}>
          <p className="text-center text-sm font-medium text-emerald-900">Accepted — we&apos;ll be in touch</p>
        </div>
      ) : null}
    </div>
  );
}

function Section({ title, body }: { title: string; body: string }) {
  return (
    <section>
      <h2 className="border-b border-zinc-200 pb-2 font-semibold text-zinc-900">{title}</h2>
      <p className="mt-4 whitespace-pre-wrap text-zinc-700">{body}</p>
    </section>
  );
}
