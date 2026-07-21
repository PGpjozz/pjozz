import { z } from "zod";

import type { AIInsight } from "@/types";

import { createServerSupabaseClient } from "@/lib/db/supabase";
import { getSetting } from "@/lib/settings/store";

import { compactJsonForAi, runClaudeJsonTask } from "./claude";
import { parseJsonObject } from "./parse-json";
import { dailyBriefOutputSchema } from "./schemas";
import type { DailyBrief, DashboardSnapshot } from "./types";

const TASK_PROMPT = `You are generating a daily AI briefing for the Pjozz Technologies revenue and delivery team.

Use ONLY the dashboard snapshot JSON provided. Do not fabricate metrics not inferable from the snapshot.

Cover:
- Pipeline health summary (stages, concentration risk)
- Leads needing attention today (stale 5+ days in snapshot)
- Deals at risk (stalled in same stage 14+ days in snapshot)
- Opportunities (hot leads not followed up in snapshot)
- Recommended top 3 actions for today (specific, owner-agnostic)
- Revenue / forecast commentary tied to weightedForecast and openPipelineValue

Important:
- The CRM is only "empty" if leadCounts.total is 0. If the snapshot has leads but no stale/hot/risky items, say so explicitly.

Return JSON only:
{
  "summary": string,
  "alerts": Array<{
    "type": "lead_score" | "follow_up" | "risk" | "opportunity" | "proposal" | "general",
    "message": string,
    "priority": "low" | "medium" | "high" | "critical",
    "actionRequired": boolean,
    "relatedId": string | null (optional, UUID when referencing a lead or pipeline row)
  }>,
  "topActions": string[] (exactly 3 items),
  "forecastNote": string
}`;

function daysBetween(iso: string, end = Date.now()): number {
  const t = new Date(iso).getTime();
  return Math.floor((end - t) / 86_400_000);
}

const ACTIVE_LEAD_STATUSES = ["new", "contacted", "qualified", "meeting", "proposal"] as const;
const ACTIVE_LEAD_SET = new Set<string>(ACTIVE_LEAD_STATUSES);

export async function buildDashboardSnapshot(): Promise<DashboardSnapshot> {
  const supabase = createServerSupabaseClient();
  const now = Date.now();
  const thresholds = await getSetting("ai.lead_thresholds");
  const fiveAgo = new Date(now - (thresholds.staleLeadDays ?? 5) * 86_400_000).toISOString();
  const fourteenAgo = new Date(now - (thresholds.riskyDealDaysInStage ?? 14) * 86_400_000).toISOString();
  const twoAgo = new Date(now - (thresholds.followUpGraceDays ?? 2) * 86_400_000).toISOString();
  const thirtyAgo = new Date(now - 30 * 86_400_000).toISOString();

  const { count: totalLeadsCount, error: countErr } = await supabase
    .from("leads")
    .select("id", { count: "exact", head: true });
  if (countErr) throw new Error(countErr.message);

  const { data: pipelineRows, error: pErr } = await supabase
    .from("pipeline")
    .select("id, lead_id, stage, probability, deal_value, updated_at");

  if (pErr) throw new Error(pErr.message);

  const pipeList = pipelineRows ?? [];
  const pipelineLeadIds = Array.from(new Set(pipeList.map((r) => r.lead_id)));
  let companyByLeadId = new Map<string, string>();
  if (pipelineLeadIds.length > 0) {
    const { data: pipeLeads, error: plErr } = await supabase
      .from("leads")
      .select("id, company_name")
      .in("id", pipelineLeadIds);
    if (plErr) throw new Error(plErr.message);
    companyByLeadId = new Map((pipeLeads ?? []).map((l) => [l.id, l.company_name]));
  }

  const rows = pipeList.map((r) => ({
    ...r,
    companyName: companyByLeadId.get(r.lead_id) ?? "Unknown",
  }));

  const stageMap = new Map<string, { dealCount: number; weightedValue: number }>();
  let openPipelineValue = 0;
  let weightedForecast = 0;

  for (const r of rows) {
    const dv = r.deal_value != null ? Number(r.deal_value) : 0;
    openPipelineValue += dv;
    const w = dv * (Number(r.probability) / 100);
    weightedForecast += w;
    const cur = stageMap.get(r.stage) ?? { dealCount: 0, weightedValue: 0 };
    cur.dealCount += 1;
    cur.weightedValue += w;
    stageMap.set(r.stage, cur);
  }

  const pipelineByStage = Array.from(stageMap.entries()).map(([stage, v]) => ({
    stage,
    dealCount: v.dealCount,
    weightedValue: Math.round(v.weightedValue * 100) / 100,
  }));

  const dealsAtRisk = rows
    .filter((r) => r.updated_at < fourteenAgo)
    .map((r) => ({
      pipelineId: r.id,
      leadId: r.lead_id,
      companyName: r.companyName,
      stage: r.stage,
      daysInStage: daysBetween(r.updated_at, now),
      dealValue: r.deal_value != null ? Number(r.deal_value) : null,
    }));

  // NOTE: We intentionally fetch without server-side `.in(status, ...)` filtering.
  // Some PostgREST setups can behave unexpectedly with `in` on TEXT enums, and we
  // want snapshot generation to be robust. We filter in JS instead.
  const { data: leadRows, error: lErr } = await supabase
    .from("leads")
    .select("id, company_name, status, updated_at, created_at, lead_score")
    .order("updated_at", { ascending: false })
    .limit(5000);

  if (lErr) throw new Error(lErr.message);

  const allLeads = leadRows ?? [];
  const leads = allLeads.filter((l) => ACTIVE_LEAD_SET.has(l.status));
  const activeLeadsCount = leads.length;

  const leadsNeedingAttention = leads
    .filter((l) => l.updated_at < fiveAgo)
    .map((l) => ({
      leadId: l.id,
      companyName: l.company_name,
      status: l.status,
      daysSinceActivity: daysBetween(l.updated_at, now),
      leadScore: l.lead_score,
    }));

  const hotLeadsNotFollowedUp = leads
    .filter(
      (l) =>
        l.lead_score >= (thresholds.hotLeadScore ?? 70) &&
        (l.status === "new" || l.status === "contacted") &&
        l.updated_at < twoAgo
    )
    .map((l) => ({
      leadId: l.id,
      companyName: l.company_name,
      leadScore: l.lead_score,
      status: l.status,
      daysSinceCreated: daysBetween(l.created_at, now),
    }));

  const { data: wonProposals, error: wErr } = await supabase
    .from("proposals")
    .select("total_value")
    .eq("status", "accepted")
    .gte("created_at", thirtyAgo);

  if (wErr) throw new Error(wErr.message);

  const wonLast30DaysZar = (wonProposals ?? []).reduce((sum, p) => sum + (Number(p.total_value) || 0), 0);

  return {
    generatedAt: new Date(now).toISOString(),
    leadCounts: {
      total: totalLeadsCount ?? 0,
      active: activeLeadsCount,
    },
    pipelineByStage,
    leadsNeedingAttention,
    dealsAtRisk,
    hotLeadsNotFollowedUp,
    forecast: {
      openPipelineValue: Math.round(openPipelineValue * 100) / 100,
      weightedForecast: Math.round(weightedForecast * 100) / 100,
      wonLast30DaysZar: Math.round(wonLast30DaysZar * 100) / 100,
    },
  };
}

function normalizeAlerts(alerts: z.infer<typeof dailyBriefOutputSchema>["alerts"]): AIInsight[] {
  const createdAt = new Date().toISOString();
  return alerts.map((a) => ({
    id: crypto.randomUUID(),
    type: a.type,
    message: a.message,
    priority: a.priority,
    actionRequired: a.actionRequired,
    relatedId: a.relatedId ?? null,
    createdAt,
  }));
}

export async function generateDailyBrief(dashboardData: DashboardSnapshot): Promise<DailyBrief> {
  const { text } = await runClaudeJsonTask({
    context: "daily-brief",
    taskSystemPrompt: TASK_PROMPT,
    userPayload: `Dashboard snapshot (JSON):\n${compactJsonForAi(dashboardData)}`,
    maxTokens: 3072,
  });
  const parsed = dailyBriefOutputSchema.safeParse(parseJsonObject(text));
  if (!parsed.success) {
    throw new Error(`Invalid daily brief JSON: ${parsed.error.message}`);
  }
  const { summary, alerts, topActions, forecastNote } = parsed.data;
  return {
    summary,
    alerts: normalizeAlerts(alerts),
    topActions,
    forecastNote,
  };
}
