"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import type { ProposalContent } from "@/lib/ai/types";
import type { Tables } from "@/lib/db/supabase";

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

  async function accept() {
    setBusy("accept");
    try {
      const res = await fetch(`/api/proposals/${proposal.id}/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const json = (await res.json()) as { ok: boolean; error?: string };
      if (!json.ok) throw new Error(json.error ?? "Failed");
      toast.success("Thank you — proposal accepted.");
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
            <div className="text-lg font-bold tracking-tight text-[#00a67e]">
              Pjozz<span className="text-black">.</span>
            </div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Technologies</div>
          </Link>
          <Link href="/client" className="text-sm font-medium text-zinc-600 underline-offset-4 hover:text-zinc-900 hover:underline">
            Client hub
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="font-serif text-3xl font-semibold text-zinc-900">{document.title}</h1>
        <p className="mt-2 text-sm text-zinc-500">Prepared for your review · ZAR pricing</p>

        <article className="mt-10 space-y-10 text-[15px] leading-relaxed">
          <Section title="Executive summary" body={document.executiveSummary} />
          <Section title="The challenge" body={document.problemStatement} />
          <Section title="Our approach" body={document.proposedSolution} />
          <section>
            <h2 className="border-b border-zinc-200 pb-2 font-semibold text-zinc-900">Deliverables</h2>
            <ul className="mt-4 list-disc space-y-2 pl-5">
              {document.deliverables.map((d, i) => (
                <li key={i}>
                  <strong>{d.item}</strong> — {d.description}
                </li>
              ))}
            </ul>
          </section>
          <section>
            <h2 className="border-b border-zinc-200 pb-2 font-semibold text-zinc-900">Timeline</h2>
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
          <section>
            <h2 className="border-b border-zinc-200 pb-2 font-semibold text-zinc-900">Investment</h2>
            <div className="mt-4 space-y-4">
              {document.investmentOptions.map((o, i) => (
                <div key={i} className="rounded-lg border border-zinc-200 bg-white p-4">
                  <p className="text-lg font-semibold text-[#00a67e]">R {o.price.toLocaleString("en-ZA")}</p>
                  <p className="font-medium text-zinc-900">{o.tier}</p>
                  <p className="mt-1 text-zinc-600">{o.description}</p>
                </div>
              ))}
            </div>
          </section>
          <Section title="Why Pjozz" body={document.whyPjozz} />
          <Section title="Next steps" body={document.nextSteps} />
        </article>

        <div className="mt-12 flex flex-col gap-3 border-t border-zinc-200 pt-8 sm:flex-row sm:items-center">
          <Button className="bg-[#00a67e] text-black hover:bg-[#00c896]" disabled={busy !== null} onClick={() => void accept()}>
            {busy === "accept" ? "Submitting…" : "Accept proposal"}
          </Button>
          <Button variant="outline" onClick={() => setShowChanges((s) => !s)}>
            Request changes
          </Button>
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
