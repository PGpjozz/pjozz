"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const inputClass =
  "w-full rounded-lg border border-violet-500/25 bg-white/[0.04] px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus-visible:border-violet-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-violet-400";

/** Shorter path for procurement — POST /api/quote */
export function QuoteForm() {
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [budgetRange, setBudgetRange] = useState("");
  const [timeline, setTimeline] = useState("");
  const [notes, setNotes] = useState("");
  const [consent, setConsent] = useState(false);
  const [honeypot, setHoneypot] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!consent) {
      toast.error("Please agree to the privacy policy to continue.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: companyName.trim() || "Quote request",
          email: email.trim(),
          budgetRange: budgetRange.trim() || undefined,
          timeline: timeline.trim() || undefined,
          notes: notes.trim(),
          consent: true,
          website: honeypot,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || data.ok === false) {
        toast.error(data.error ?? "Request failed");
        return;
      }
      toast.success("Quote request received — we’ll follow up shortly.");
      setCompanyName("");
      setEmail("");
      setBudgetRange("");
      setTimeline("");
      setNotes("");
      setConsent(false);
      setHoneypot("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Network error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={(e) => void submit(e)} className="space-y-4" noValidate>
      <div className="absolute -left-[9999px] h-0 w-0 overflow-hidden" aria-hidden="true">
        <label htmlFor="quote-website">Company website</label>
        <input
          id="quote-website"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          value={honeypot}
          onChange={(e) => setHoneypot(e.target.value)}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="quote-company" className="text-xs uppercase tracking-wider text-slate-500">
            Company *
          </label>
          <input
            id="quote-company"
            className={cn(inputClass, "mt-1")}
            required
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            autoComplete="organization"
          />
        </div>
        <div>
          <label htmlFor="quote-email" className="text-xs uppercase tracking-wider text-slate-500">
            Work email *
          </label>
          <input
            id="quote-email"
            className={cn(inputClass, "mt-1")}
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="quote-budget" className="text-xs uppercase tracking-wider text-slate-500">
            Budget range
          </label>
          <input
            id="quote-budget"
            className={cn(inputClass, "mt-1")}
            value={budgetRange}
            onChange={(e) => setBudgetRange(e.target.value)}
            placeholder="e.g. R50k–R150k"
          />
        </div>
        <div>
          <label htmlFor="quote-timeline" className="text-xs uppercase tracking-wider text-slate-500">
            Timeline
          </label>
          <input
            id="quote-timeline"
            className={cn(inputClass, "mt-1")}
            value={timeline}
            onChange={(e) => setTimeline(e.target.value)}
            placeholder="e.g. Go-live Q3"
          />
        </div>
      </div>
      <div>
        <label htmlFor="quote-notes" className="text-xs uppercase tracking-wider text-slate-500">
          What do you need? *
        </label>
        <textarea
          id="quote-notes"
          className={cn(inputClass, "mt-1 min-h-[100px]")}
          required
          minLength={15}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>
      <label className="flex items-start gap-3 text-sm text-slate-400">
        <input
          type="checkbox"
          className="mt-1 h-4 w-4 rounded border-white/20 bg-white/5 text-violet-500 focus:ring-violet-400"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          required
        />
        <span>
          I agree to the{" "}
          <Link href="/privacy" className="text-violet-300 underline-offset-2 hover:underline">
            privacy policy
          </Link>
          .
        </span>
      </label>
      <Button
        type="submit"
        disabled={busy}
        variant="outline"
        className="w-full border-violet-500/40 text-violet-100 hover:bg-violet-500/10"
      >
        {busy ? "Sending…" : "Submit quote request"}
      </Button>
    </form>
  );
}
