import { NextResponse } from "next/server";

import type { DashboardSummaryResponse } from "@/lib/dashboard/summary-types";
import { createServerSupabaseClient } from "@/lib/db/supabase";

export const dynamic = "force-dynamic";

const ACTIVE = ["new", "contacted", "qualified", "meeting", "proposal"] as const;

const SERVICE_LABEL: Record<string, string> = {
  webapp: "Web app",
  mobileapp: "Mobile",
  automation: "Automation",
  network: "Network",
  security_cam: "Security cams",
  software: "Custom software",
};

export async function GET() {
  try {
    const supabase = createServerSupabaseClient();

    const ninetyAgo = new Date(Date.now() - 90 * 86_400_000).toISOString();
    const now = Date.now();
    const next30 = new Date(now + 30 * 86_400_000).toISOString();

    const [
      { data: pipeRows, error: pErr },
      { data: clientRows, error: cErr },
      { data: closedRows, error: clErr },
    ] = await Promise.all([
      supabase.from("pipeline").select("id, stage, deal_value, lead_id"),
      supabase.from("clients").select("retainer_amount").eq("retainer_active", true),
      supabase.from("leads").select("status").in("status", ["won", "lost"]).gte("updated_at", ninetyAgo),
    ]);

    // Finance tables may be unapplied in early setups; treat as 0s instead of failing dashboard.
    let invoiceRows: Array<{ status: string; due_at: string | null; total: number | null }> = [];
    try {
      const { data, error } = await supabase
        .from("invoices")
        .select("status, due_at, total")
        .in("status", ["sent", "overdue"]);
      if (!error && data) invoiceRows = data as typeof invoiceRows;
    } catch {
      invoiceRows = [];
    }

    if (pErr) throw new Error(pErr.message);
    if (cErr) throw new Error(cErr.message);
    if (clErr) throw new Error(clErr.message);

    const rawPipes = pipeRows ?? [];
    const pipeLeadIds = Array.from(new Set(rawPipes.map((p) => p.lead_id)));
    let leadMetaById = new Map<string, { status: string; service_type: string | null }>();
    if (pipeLeadIds.length > 0) {
      const { data: pipeLeads, error: plErr } = await supabase
        .from("leads")
        .select("id, status, service_type")
        .in("id", pipeLeadIds);
      if (plErr) throw new Error(plErr.message);
      leadMetaById = new Map(
        (pipeLeads ?? []).map((l) => [l.id, { status: l.status, service_type: l.service_type ?? null }])
      );
    }

    const mrrZar = (clientRows ?? []).reduce((s, r) => s + (Number(r.retainer_amount) || 0), 0);

    let won = 0;
    let lost = 0;
    for (const r of closedRows ?? []) {
      if (r.status === "won") won += 1;
      else lost += 1;
    }
    const closed = won + lost;
    const winRate90d = closed > 0 ? Math.round((won / closed) * 1000) / 10 : null;

    const stageMap = new Map<string, { count: number; valueZar: number }>();
    const serviceMap = new Map<string, number>();
    let pipelineValueZar = 0;
    let activeLeadsCount = 0;

    for (const p of rawPipes) {
      const lead = leadMetaById.get(p.lead_id);
      const status = lead?.status;
      if (!status || !ACTIVE.includes(status as (typeof ACTIVE)[number])) continue;

      const v = p.deal_value != null ? Number(p.deal_value) : 0;
      pipelineValueZar += v;
      activeLeadsCount += 1;

      const cur = stageMap.get(p.stage) ?? { count: 0, valueZar: 0 };
      cur.count += 1;
      cur.valueZar += v;
      stageMap.set(p.stage, cur);

      const svc = lead?.service_type ?? "unknown";
      serviceMap.set(svc, (serviceMap.get(svc) ?? 0) + v);
    }

    const pipelineByStage = Array.from(stageMap.entries())
      .map(([stage, v]) => ({ stage, count: v.count, valueZar: Math.round(v.valueZar * 100) / 100 }))
      .sort((a, b) => b.valueZar - a.valueZar);

    const donutOrder = ["webapp", "mobileapp", "automation", "network", "security_cam", "software"];
    const revenueByService = donutOrder.map((service) => ({
      service,
      label: SERVICE_LABEL[service] ?? service,
      valueZar: Math.round((serviceMap.get(service) ?? 0) * 100) / 100,
    }));

    const openInvoicesZar = (invoiceRows ?? []).reduce((s, r) => s + (Number(r.total) || 0), 0);
    const overdueInvoicesZar = (invoiceRows ?? [])
      .filter((r) => r.status === "overdue")
      .reduce((s, r) => s + (Number(r.total) || 0), 0);
    const dueNext30DaysZar = (invoiceRows ?? [])
      .filter((r) => r.due_at && r.due_at <= next30)
      .reduce((s, r) => s + (Number(r.total) || 0), 0);

    const data: DashboardSummaryResponse = {
      pipelineValueZar: Math.round(pipelineValueZar * 100) / 100,
      activeLeadsCount,
      winRate90d,
      mrrZar: Math.round(mrrZar * 100) / 100,
      openInvoicesZar: Math.round(openInvoicesZar * 100) / 100,
      overdueInvoicesZar: Math.round(overdueInvoicesZar * 100) / 100,
      dueNext30DaysZar: Math.round(dueNext30DaysZar * 100) / 100,
      pipelineByStage,
      revenueByService,
      contextBlock: JSON.stringify({
        pipelineValueZar: Math.round(pipelineValueZar * 100) / 100,
        activeLeadsCount,
        winRate90d,
        mrrZar: Math.round(mrrZar * 100) / 100,
        openInvoicesZar: Math.round(openInvoicesZar * 100) / 100,
        overdueInvoicesZar: Math.round(overdueInvoicesZar * 100) / 100,
        dueNext30DaysZar: Math.round(dueNext30DaysZar * 100) / 100,
        pipelineByStage,
        revenueByService,
      }),
    };

    return NextResponse.json({ ok: true as const, data });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ ok: false as const, error: msg }, { status: 500 });
  }
}
