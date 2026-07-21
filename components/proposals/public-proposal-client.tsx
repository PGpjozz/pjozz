"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { BrandLogo } from "@/components/brand/brand-logo";
import { Button } from "@/components/ui/button";
import type { ProposalContent } from "@/lib/ai/types";
import type { Tables } from "@/lib/db/supabase";

type ProposalDefaults = {
  currency: string;
  template: { sections: Array<{ key: string; title: string; enabled: boolean; defaultText?: string }> };
};

export function PublicProposalClient({
  proposal,
  document,
  token,
}: {
  proposal: Tables<"proposals">;
  document: ProposalContent;
  token: string;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [showChanges, setShowChanges] = useState(false);
  const [defaults, setDefaults] = useState<ProposalDefaults | null>(null);
  const [accepted, setAccepted] = useState(proposal.status === "accepted");
  const [invoiceId, setInvoiceId] = useState<string | null>(null);

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

  async function accept() {
    if (accepted) return;
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
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="min-h-screen bg-[#fafafa] text-[#1a1a1a]">
      <header className="border-b border-black/10 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-6 py-5">
          <Link href="/" className="transition-opacity hover:opacity-80">
            <BrandLogo href={null} size="md" showWordmark tone="light" />
          </Link>
          <Link href="/client" className="text-sm font-medium text-zinc-600 underline-offset-4 hover:text-zinc-900 hover:underline">
            Client hub
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="font-serif text-3xl font-semibold text-zinc-900">{document.title}</h1>
        <p className="mt-2 text-sm text-zinc-500">Prepared for your review · {currency} pricing</p>

        <article className="mt-10 space-y-10 text-[15px] leading-relaxed">
          {sectionMeta.map((s) => {
            if (s.key === "executiveSummary") return <Section key={s.key} title={s.title} body={document.executiveSummary} />;
            if (s.key === "problemStatement") return <Section key={s.key} title={s.title} body={document.problemStatement} />;
            if (s.key === "proposedSolution") return <Section key={s.key} title={s.title} body={document.proposedSolution} />;
            if (s.key === "whyPjozz") return <Section key={s.key} title={s.title} body={document.whyPjozz} />;
            if (s.key === "nextSteps") return <Section key={s.key} title={s.title} body={document.nextSteps} />;
            if (s.key === "deliverables") {
              return (
                <section key={s.key}>
                  <h2 className="border-b border-zinc-200 pb-2 font-semibold text-zinc-900">{s.title}</h2>
                  <ul className="mt-4 list-disc space-y-2 pl-5">
                    {document.deliverables.map((d, i) => (
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
                    {document.timeline.map((t, i) => (
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
                    {document.investmentOptions.map((o, i) => (
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

        <div className="mt-12 flex flex-col gap-3 border-t border-zinc-200 pt-8 sm:flex-row sm:items-center">
          {accepted ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
              <p className="font-semibold">Proposal accepted. Thank you.</p>
              <p className="mt-1 text-emerald-800/80">
                Pjozz will follow up with invoice and kickoff next steps
                {invoiceId ? ` (invoice draft ready).` : "."}
              </p>
            </div>
          ) : (
            <>
              <Button className="bg-[#00a67e] text-black hover:bg-[#00c896]" disabled={busy !== null} onClick={() => void accept()}>
                {busy === "accept" ? "Submitting…" : "Accept proposal"}
              </Button>
              <Button variant="outline" onClick={() => setShowChanges((s) => !s)}>
                Request changes
              </Button>
            </>
          )}
        </div>

        {showChanges ? (
          <div className="mt-6 rounded-xl border border-zinc-200 bg-white p-4">
            <label className="mb-2 block text-xs font-medium uppercase text-zinc-500">What should we adjust?</label>
            <textarea
              className="w-full rounded-lg border border-zinc-300 p-3 text-sm"
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
