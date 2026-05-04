import { NextResponse } from "next/server";
import { z } from "zod";

import type { Tables } from "@/lib/db/supabase";
import { createServerSupabaseClient } from "@/lib/db/supabase";
import { fetchLatestOutreachByLeadIds } from "@/lib/leads/api-query";
import {
  COLUMN_META,
  type PipelineBoardCard,
  inferKanbanStage,
} from "@/lib/pipeline/kanban";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  serviceType: z
    .enum(["webapp", "mobileapp", "automation", "network", "security_cam", "software"])
    .optional(),
  minDeal: z.coerce.number().optional(),
  maxDeal: z.coerce.number().optional(),
  hideLost: z.enum(["true", "false"]).optional(),
});

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams.entries()));
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false as const, error: "Invalid query", issues: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const { serviceType, minDeal, maxDeal, hideLost } = parsed.data;
    const supabase = createServerSupabaseClient();

    const [wonRes, lostRes] = await Promise.all([
      supabase.from("leads").select("*", { count: "exact", head: true }).eq("status", "won"),
      supabase.from("leads").select("*", { count: "exact", head: true }).eq("status", "lost"),
    ]);
    if (wonRes.error) throw new Error(wonRes.error.message);
    if (lostRes.error) throw new Error(lostRes.error.message);
    const wonCount = wonRes.count ?? 0;
    const lostCount = lostRes.count ?? 0;
    const closed = wonCount + lostCount;
    const winRate = closed > 0 ? Math.round((wonCount / closed) * 1000) / 10 : null;

    let q = supabase.from("leads").select("*").order("updated_at", { ascending: false });
    if (serviceType) q = q.eq("service_type", serviceType);
    if (hideLost === "true") q = q.neq("status", "lost");

    const { data: leads, error: lErr } = await q;
    if (lErr) throw new Error(lErr.message);
    const leadRows = leads ?? [];
    if (leadRows.length === 0) {
      return NextResponse.json({
        ok: true as const,
        data: {
          cards: [] as PipelineBoardCard[],
          metrics: { totalPipelineZar: 0, weightedForecast: 0, winRate },
        },
      });
    }

    const ids = leadRows.map((l) => l.id);
    const { data: pipes, error: pErr } = await supabase.from("pipeline").select("*").in("lead_id", ids);
    if (pErr) throw new Error(pErr.message);
    const pipeBy = new Map((pipes ?? []).map((p) => [p.lead_id, p as Tables<"pipeline">]));
    const outreachLatest = await fetchLatestOutreachByLeadIds(supabase, ids);

    const cards: PipelineBoardCard[] = [];

    for (const lead of leadRows) {
      const pipe = pipeBy.get(lead.id) ?? null;
      const stage = inferKanbanStage(lead, pipe);
      if (hideLost === "true" && stage === "Lost ✗") continue;

      const dv = pipe?.deal_value != null ? Number(pipe.deal_value) : null;
      if (minDeal !== undefined && (dv == null || dv < minDeal)) continue;
      if (maxDeal !== undefined && (dv == null || dv > maxDeal)) continue;

      const ev = outreachLatest.get(lead.id);
      const last = ev && ev > lead.updated_at ? ev : lead.updated_at;

      cards.push({
        leadId: lead.id,
        columnId: COLUMN_META[stage].id,
        stage,
        companyName: lead.company_name,
        contactName: lead.contact_name,
        email: lead.email,
        serviceType: lead.service_type,
        leadScore: lead.lead_score,
        leadStatus: lead.status,
        dealValue: dv,
        probability: pipe?.probability ?? 20,
        pipelineUpdatedAt: pipe?.updated_at ?? null,
        lastActivityAt: last,
      });
    }

    let totalPipelineZar = 0;
    let weightedForecast = 0;

    for (const c of cards) {
      if (c.stage === "Lost ✗") continue;
      const v = c.dealValue ?? 0;
      if (c.stage === "Won ✓") {
        totalPipelineZar += v;
        weightedForecast += v;
      } else {
        totalPipelineZar += v;
        weightedForecast += v * (c.probability / 100);
      }
    }

    return NextResponse.json({
      ok: true as const,
      data: {
        cards,
        metrics: {
          totalPipelineZar: Math.round(totalPipelineZar * 100) / 100,
          weightedForecast: Math.round(weightedForecast * 100) / 100,
          winRate,
        },
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server error";
    const status = msg.includes("is not set") ? 503 : 500;
    return NextResponse.json({ ok: false as const, error: msg }, { status });
  }
}
