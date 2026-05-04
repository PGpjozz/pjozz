"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  COLUMN_META,
  type KanbanStage,
  type PipelineBoardCard,
  daysBetween,
  stageToLeadStatus,
} from "@/lib/pipeline/kanban";
import type { LeadServiceType } from "@/types";

import { SERVICE_LABEL } from "@/components/leads/lead-constants";
import { AiPipelinePanel } from "./ai-pipeline-panel";
import { PipelineKanban } from "./pipeline-kanban";

type Metrics = { totalPipelineZar: number; weightedForecast: number; winRate: number | null };

const SERVICES: LeadServiceType[] = [
  "webapp",
  "mobileapp",
  "automation",
  "network",
  "security_cam",
  "software",
];

export function PipelinePageClient() {
  const [cards, setCards] = useState<PipelineBoardCard[]>([]);
  const [metrics, setMetrics] = useState<Metrics>({
    totalPipelineZar: 0,
    weightedForecast: 0,
    winRate: null,
  });
  const [loading, setLoading] = useState(true);
  const [serviceType, setServiceType] = useState<LeadServiceType | "">("");
  const [minDeal, setMinDeal] = useState("");
  const [maxDeal, setMaxDeal] = useState("");
  const [hideLost, setHideLost] = useState(false);
  const [insightsOpen, setInsightsOpen] = useState(false);
  const [briefSummary, setBriefSummary] = useState<string | null>(null);
  const [briefLoading, setBriefLoading] = useState(false);

  const qs = useMemo(() => {
    const p = new URLSearchParams();
    if (serviceType) p.set("serviceType", serviceType);
    if (minDeal.trim() !== "") p.set("minDeal", minDeal.trim());
    if (maxDeal.trim() !== "") p.set("maxDeal", maxDeal.trim());
    if (hideLost) p.set("hideLost", "true");
    return p.toString();
  }, [serviceType, minDeal, maxDeal, hideLost]);

  const loadBoard = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true);
    try {
      const res = await fetch(`/api/pipeline/board${qs ? `?${qs}` : ""}`);
      const json = (await res.json()) as {
        ok: boolean;
        data?: { cards: PipelineBoardCard[]; metrics: Metrics };
        error?: string;
      };
      if (json.ok && json.data) {
        setCards(json.data.cards);
        setMetrics(json.data.metrics);
      } else if (!opts?.silent) {
        toast.error(json.error ?? "Could not load pipeline");
      }
    } catch {
      if (!opts?.silent) toast.error("Could not load pipeline");
    } finally {
      if (!opts?.silent) setLoading(false);
    }
  }, [qs]);

  useEffect(() => {
    void loadBoard();
  }, [loadBoard]);

  const pipelineContext = useMemo(() => {
    const filterLine = `serviceType=${serviceType || "all"}; dealZar=${minDeal || "—"}–${maxDeal || "—"}; hideLost=${hideLost}`;
    const lines = cards.map((c) => ({
      leadId: c.leadId,
      company: c.companyName,
      stage: c.stage,
      dealZar: c.dealValue,
      probability: c.probability,
      score: c.leadScore,
      daysInStage: daysBetween(c.pipelineUpdatedAt ?? c.lastActivityAt),
      lastActivity: c.lastActivityAt,
    }));
    return [
      "## Current pipeline (filtered board)",
      filterLine,
      "",
      "## Metrics (visible deals, lost excluded from totals where applicable)",
      `- Total pipeline ZAR: ${metrics.totalPipelineZar}`,
      `- Weighted forecast ZAR: ${metrics.weightedForecast}`,
      `- Win rate (all closed in CRM): ${metrics.winRate != null ? `${metrics.winRate}%` : "n/a"}`,
      "",
      "## Cards",
      JSON.stringify(lines, null, 2),
    ].join("\n");
  }, [cards, metrics, serviceType, minDeal, maxDeal, hideLost]);

  async function openInsights() {
    setInsightsOpen(true);
    if (briefSummary !== null || briefLoading) return;
    setBriefLoading(true);
    try {
      const res = await fetch("/api/ai/daily-brief");
      const json = (await res.json()) as { ok: boolean; data?: { summary?: string }; error?: string };
      if (json.ok && json.data?.summary) setBriefSummary(json.data.summary);
      else toast.error(json.error ?? "Could not load daily brief");
    } catch {
      toast.error("Could not load daily brief");
    } finally {
      setBriefLoading(false);
    }
  }

  const onMoveCard = useCallback(
    async (leadId: string, toStage: KanbanStage) => {
      const prev = cards;
      const nowIso = new Date().toISOString();
      setCards((c) =>
        c.map((row) =>
          row.leadId === leadId
            ? {
                ...row,
                stage: toStage,
                columnId: COLUMN_META[toStage].id,
                leadStatus: stageToLeadStatus(toStage),
                pipelineUpdatedAt: nowIso,
              }
            : row
        )
      );
      try {
        const res = await fetch(`/api/leads/${leadId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: stageToLeadStatus(toStage),
            pipelineStage: toStage,
          }),
        });
        const json = (await res.json()) as { ok: boolean; error?: string };
        if (!res.ok || !json.ok) throw new Error(json.error ?? res.statusText);
        toast.success("Pipeline updated");
        void loadBoard({ silent: true });
      } catch (e) {
        setCards(prev);
        toast.error(e instanceof Error ? e.message : "Update failed");
      }
    },
    [cards, loadBoard]
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6 lg:flex-row">
      <div className={cn("flex min-w-0 flex-1 flex-col gap-6", insightsOpen && "lg:pr-0")}>
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
              Sales pipeline
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Drag deals between stages — updates sync to CRM instantly.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            className="shrink-0 border-primary/40 text-primary hover:bg-primary/10"
            onClick={() => void openInsights()}
          >
            AI Insights
          </Button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <MetricTile
            label="Total pipeline (excl. lost)"
            value={`R ${metrics.totalPipelineZar.toLocaleString("en-ZA", { maximumFractionDigits: 0 })}`}
          />
          <MetricTile
            label="Weighted forecast"
            value={`R ${metrics.weightedForecast.toLocaleString("en-ZA", { maximumFractionDigits: 0 })}`}
            accent
          />
          <MetricTile
            label="Win rate (closed)"
            value={metrics.winRate != null ? `${metrics.winRate}%` : "—"}
          />
        </div>

        <div className="rounded-xl border border-border bg-card/30 p-4 backdrop-blur">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Service
              </label>
              <select
                className="pj-input w-full font-mono text-sm"
                value={serviceType}
                onChange={(e) => setServiceType(e.target.value as LeadServiceType | "")}
              >
                <option value="">All</option>
                {SERVICES.map((s) => (
                  <option key={s} value={s}>
                    {SERVICE_LABEL[s] ?? s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Min deal (ZAR)
              </label>
              <input
                className="pj-input w-full font-mono text-sm"
                type="number"
                min={0}
                placeholder="0"
                value={minDeal}
                onChange={(e) => setMinDeal(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Max deal (ZAR)
              </label>
              <input
                className="pj-input w-full font-mono text-sm"
                type="number"
                min={0}
                placeholder="Any"
                value={maxDeal}
                onChange={(e) => setMaxDeal(e.target.value)}
              />
            </div>
            <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-1">
              <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-background/50 px-3 py-2 font-mono text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  checked={hideLost}
                  onChange={(e) => setHideLost(e.target.checked)}
                  className="rounded border-border"
                />
                Hide Lost column
              </label>
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 rounded-xl border border-border bg-[#0A0A0A]/40 p-3">
          {loading ? (
            <div className="flex h-[420px] items-center justify-center font-mono text-sm text-muted-foreground">
              Loading board…
            </div>
          ) : (
            <PipelineKanban cards={cards} hideLost={hideLost} onMoveCard={onMoveCard} />
          )}
        </div>
      </div>

      {insightsOpen ? (
        <AiPipelinePanel
          open
          onClose={() => setInsightsOpen(false)}
          pipelineContext={pipelineContext}
          dailyBriefSummary={briefSummary}
          dailyBriefLoading={briefLoading}
        />
      ) : null}
    </div>
  );
}

function MetricTile({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card/40 px-4 py-3",
        accent && "border-primary/30 bg-primary/5"
      )}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 font-mono text-lg font-semibold text-foreground">{value}</p>
    </div>
  );
}
