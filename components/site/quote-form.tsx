"use client";

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
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
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
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || data.ok === false) {
        toast.error(data.error ?? "Request failed");
        return;
      }
      toast.success("Quote request received — we’ll follow up from CRM.");
      setCompanyName("");
      setEmail("");
      setBudgetRange("");
      setTimeline("");
      setNotes("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Network error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={(e) => void submit(e)} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="text-xs uppercase tracking-wider text-slate-500">Company *</label>
          <input
            className={cn(inputClass, "mt-1")}
            required
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs uppercase tracking-wider text-slate-500">Work email *</label>
          <input
            className={cn(inputClass, "mt-1")}
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="text-xs uppercase tracking-wider text-slate-500">Budget range</label>
          <input
            className={cn(inputClass, "mt-1")}
            value={budgetRange}
            onChange={(e) => setBudgetRange(e.target.value)}
            placeholder="e.g. R50k–R150k"
          />
        </div>
        <div>
          <label className="text-xs uppercase tracking-wider text-slate-500">Timeline</label>
          <input
            className={cn(inputClass, "mt-1")}
            value={timeline}
            onChange={(e) => setTimeline(e.target.value)}
            placeholder="e.g. Go-live Q3"
          />
        </div>
      </div>
      <div>
        <label className="text-xs uppercase tracking-wider text-slate-500">What do you need? *</label>
        <textarea
          className={cn(inputClass, "mt-1 min-h-[100px]")}
          required
          minLength={15}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>
      <Button type="submit" disabled={busy} variant="outline" className="w-full border-violet-500/40 text-violet-100 hover:bg-violet-500/10">
        {busy ? "Sending…" : "Submit quote request"}
      </Button>
    </form>
  );
}
