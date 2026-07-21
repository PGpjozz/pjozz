"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { FileText, Mail, MessageCircle, PlusCircle, Sparkles } from "lucide-react";

import type { DailyBrief } from "@/lib/ai/types";
import type { DashboardSummaryResponse } from "@/lib/dashboard/summary-types";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { AIChat } from "@/components/dashboard/AIChat";
import { AIInsightsPanel } from "@/components/dashboard/AIInsightsPanel";
import { DashboardCharts } from "@/components/dashboard/DashboardCharts";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useFeatureFlags } from "@/components/flags/feature-flags";

function alertTone(p: string) {
  switch (p) {
    case "critical":
      return "border-red-500/40 bg-red-950/30 text-red-100";
    case "high":
      return "border-orange-500/40 bg-orange-950/25 text-orange-100";
    case "medium":
      return "border-amber-500/35 bg-amber-950/20 text-amber-50";
    default:
      return "border-border bg-muted/40 text-muted-foreground";
  }
}

export function DashboardClient() {
  const { loading: flagsLoading, aiEnabled } = useFeatureFlags();
  const [brief, setBrief] = useState<DailyBrief | null>(null);
  const [briefLoading, setBriefLoading] = useState(true);
  const [briefBusy, setBriefBusy] = useState(false);
  const [summary, setSummary] = useState<DashboardSummaryResponse | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);
  const [insightRefresh, setInsightRefresh] = useState(0);

  const loadBrief = useCallback(async (opts?: { refresh?: boolean }) => {
    const q = opts?.refresh ? "?refresh=1" : "";
    const res = await fetch(`/api/ai/daily-brief${q}`);
    const json = (await res.json()) as { ok: boolean; data?: DailyBrief; error?: string };
    if (!json.ok) throw new Error(json.error ?? "Brief failed");
    setBrief(json.data ?? null);
  }, []);

  const loadSummary = useCallback(async () => {
    const res = await fetch("/api/dashboard/summary");
    const json = (await res.json()) as { ok: boolean; data?: DashboardSummaryResponse; error?: string };
    if (!json.ok) throw new Error(json.error ?? "Summary failed");
    setSummary(json.data ?? null);
  }, []);

  useEffect(() => {
    if (flagsLoading) return;
    (async () => {
      setBriefLoading(true);
      try {
        if (!aiEnabled) {
          setBrief(null);
          return;
        }
        await loadBrief();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Could not load brief");
      } finally {
        setBriefLoading(false);
      }
    })();
  }, [loadBrief, aiEnabled, flagsLoading]);

  useEffect(() => {
    (async () => {
      setSummaryLoading(true);
      try {
        await loadSummary();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Could not load metrics");
      } finally {
        setSummaryLoading(false);
      }
    })();
  }, [loadSummary]);

  useEffect(() => {
    const id = window.setInterval(() => {
      void (async () => {
        try {
          if (!aiEnabled) return;
          await loadBrief({ refresh: false });
          setInsightRefresh((t) => t + 1);
        } catch {
          /* silent */
        }
      })();
    }, 30 * 60 * 1000);
    return () => window.clearInterval(id);
  }, [loadBrief, aiEnabled]);

  const regenerate = async () => {
    if (!aiEnabled) {
      toast.error("AI is disabled in Settings.");
      return;
    }
    setBriefBusy(true);
    try {
      await loadBrief({ refresh: true });
      setInsightRefresh((t) => t + 1);
      toast.success("Brief regenerated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Regenerate failed");
    } finally {
      setBriefBusy(false);
    }
  };

  const fmtZar = (n: number) =>
    `R ${n.toLocaleString("en-ZA", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  return (
    <div className="mx-auto max-w-[1600px]">
      <header className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground md:text-3xl">Command centre</h1>
          <p className="mt-1 text-sm text-muted-foreground">Daily brief, pipeline health, and live activity for Pjozz Technologies.</p>
        </div>
      </header>

      <div className="flex flex-col gap-6 xl:flex-row xl:items-start">
        <div className="min-w-0 flex-1 space-y-6">
          <section className="overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-card via-card to-primary/5 shadow-sm">
            <div className="border-b border-primary/20 bg-primary/10 px-5 py-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-heading text-xs font-semibold uppercase tracking-widest text-primary">Pjozz Technologies</p>
                  <h2 className="mt-1 font-heading text-lg font-semibold text-foreground">AI daily brief</h2>
                  <p className="text-xs text-muted-foreground">{new Date().toLocaleDateString("en-ZA", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={briefBusy || briefLoading || flagsLoading || !aiEnabled}
                  onClick={() => void regenerate()}
                  title={!aiEnabled ? "AI is disabled in Settings" : "Regenerate brief"}
                >
                  <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                  {briefBusy ? "Working…" : "Regenerate"}
                </Button>
              </div>
            </div>

            <div className="p-5">
              {briefLoading || flagsLoading ? (
                <div className="space-y-4 animate-pulse">
                  <div className="h-4 w-full max-w-3xl rounded bg-muted" />
                  <div className="h-4 w-full max-w-2xl rounded bg-muted" />
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="h-16 rounded-lg bg-muted" />
                    <div className="h-16 rounded-lg bg-muted" />
                  </div>
                  <div className="h-24 rounded-lg bg-muted" />
                </div>
              ) : !aiEnabled ? (
                <p className="text-sm text-muted-foreground">AI is disabled in Settings.</p>
              ) : brief ? (
                <div className="space-y-6">
                  <div>
                    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Pipeline summary</h3>
                    <p className="text-sm leading-relaxed text-foreground/95">{brief.summary}</p>
                  </div>
                  <div>
                    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Alerts</h3>
                    <ul className="grid gap-2 sm:grid-cols-2">
                      {brief.alerts.map((a) => (
                        <li key={a.id} className={cn("rounded-lg border px-3 py-2 text-sm", alertTone(a.priority))}>
                          {a.message}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Top 3 actions today</h3>
                    <ol className="list-decimal space-y-1 pl-5 text-sm text-foreground/95">
                      {brief.topActions.map((t, i) => (
                        <li key={i}>{t}</li>
                      ))}
                    </ol>
                  </div>
                  <div>
                    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Revenue forecast</h3>
                    <p className="text-sm leading-relaxed text-foreground/95">{brief.forecastNote}</p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No brief available.</p>
              )}
            </div>
          </section>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {summaryLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-[104px] animate-pulse rounded-xl border border-border bg-muted/40" />
              ))
            ) : summary ? (
              <>
                <MetricCard label="Pipeline value" value={fmtZar(summary.pipelineValueZar)} hint="Active deals (excl. won/lost)" />
                <MetricCard label="Active leads" value={String(summary.activeLeadsCount)} hint="In pipeline stages" />
                <MetricCard
                  label="Win rate (90d)"
                  value={summary.winRate90d != null ? `${summary.winRate90d}%` : "—"}
                  hint="Won ÷ (won + lost), trailing 90 days"
                />
                <MetricCard label="MRR (retainers)" value={fmtZar(summary.mrrZar)} hint="Active retainer clients" />
                <MetricCard
                  label="Open invoices"
                  value={fmtZar(summary.openInvoicesZar)}
                  hint="Sent + overdue invoices"
                />
                <MetricCard
                  label="Overdue"
                  value={fmtZar(summary.overdueInvoicesZar)}
                  hint="Immediate follow-up list"
                />
              </>
            ) : null}
          </div>

          {summary && !summaryLoading ? <DashboardCharts summary={summary} /> : (
            <div className="h-64 animate-pulse rounded-xl border border-border bg-muted/30" />
          )}

          <div className="flex flex-wrap gap-2 rounded-xl border border-dashed border-primary/30 bg-primary/5 p-4">
            <span className="w-full font-mono text-[10px] font-medium uppercase tracking-wider text-primary">Quick actions</span>
            <Link href="/leads" className={cn(buttonVariants({ variant: "default", size: "sm" }), "gap-1.5")}>
              <PlusCircle className="h-4 w-4" />
              Add new lead
            </Link>
            <Link href="/outreach/new" className={cn(buttonVariants({ variant: "secondary", size: "sm" }), "gap-1.5")}>
              <Mail className="h-4 w-4" />
              New campaign
            </Link>
            <Link href="/proposals/new" className={cn(buttonVariants({ variant: "secondary", size: "sm" }), "gap-1.5")}>
              <FileText className="h-4 w-4" />
              Generate proposal
            </Link>
            <Button type="button" variant="outline" size="sm" className="gap-1.5 border-primary/40" onClick={() => setChatOpen(true)}>
              <MessageCircle className="h-4 w-4" />
              AI chat
            </Button>
          </div>

          <ActivityFeed />
        </div>

        <AIInsightsPanel className="w-full shrink-0 xl:sticky xl:top-6 xl:w-[320px]" refreshToken={insightRefresh} />
      </div>

      <AIChat open={chatOpen} onOpenChange={setChatOpen} contextBlock={summary?.contextBlock ?? ""} />
    </div>
  );
}
