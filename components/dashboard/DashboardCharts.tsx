"use client";

import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import type { DashboardSummaryResponse } from "@/lib/dashboard/summary-types";

const DONUT_COLORS = ["#00e5a0", "#0ea5e9", "#a855f7", "#f59e0b", "#64748b", "#ec4899"];

export function DashboardCharts({ summary }: { summary: DashboardSummaryResponse }) {
  const barData = summary.pipelineByStage.map((r) => ({
    ...r,
    label: `${r.stage} (${r.count})`,
  }));

  const pieData = summary.revenueByService.filter((d) => d.valueZar > 0);

  return (
    <div className="flex flex-col gap-4 lg:flex-row">
      <div className="min-h-[300px] w-full rounded-xl border border-border bg-card/30 p-4 lg:w-[60%]">
        <h3 className="mb-3 font-heading text-sm font-semibold text-foreground">Pipeline by stage</h3>
        <div className="h-[280px] w-full">
          {barData.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No active pipeline rows yet.</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} layout="vertical" margin={{ left: 4, right: 16, top: 4, bottom: 4 }}>
                <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `R${Number(v).toLocaleString("en-ZA")}`} />
                <YAxis type="category" dataKey="stage" width={88} tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(value, _name, item) => {
                    const v = typeof value === "number" ? value : Number(value);
                    const count = (item?.payload as { count?: number } | undefined)?.count ?? 0;
                    return [`R ${Number.isFinite(v) ? v.toLocaleString("en-ZA") : "—"} · ${count} deals`, "Value"];
                  }}
                />
                <Bar dataKey="valueZar" name="Pipeline (ZAR)" fill="hsl(160 84% 45%)" radius={[0, 6, 6, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
      <div className="min-h-[300px] w-full rounded-xl border border-border bg-card/30 p-4 lg:w-[40%]">
        <h3 className="mb-3 font-heading text-sm font-semibold text-foreground">Revenue by service</h3>
        <div className="flex h-[280px] flex-col items-center justify-center sm:flex-row">
          {pieData.length === 0 ? (
            <p className="px-4 text-center text-sm text-muted-foreground">No pipeline value attributed to service types yet.</p>
          ) : (
            <>
              <div className="h-[220px] w-full max-w-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="valueZar"
                      nameKey="label"
                      cx="50%"
                      cy="50%"
                      innerRadius={56}
                      outerRadius={78}
                      paddingAngle={2}
                    >
                      {pieData.map((_, i) => (
                        <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]!} stroke="hsl(var(--background))" strokeWidth={1} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(v) => {
                        const n = typeof v === "number" ? v : Number(v);
                        return [`R ${Number.isFinite(n) ? n.toLocaleString("en-ZA") : "—"}`, "Pipeline"];
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground sm:mt-0 sm:ml-2 sm:block sm:space-y-1">
                {summary.revenueByService.map((d, i) => (
                  <li key={d.service} className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: DONUT_COLORS[i % DONUT_COLORS.length] }} />
                    <span className="text-foreground/90">{d.label}</span>
                    <span className="font-mono text-muted-foreground">R{d.valueZar.toLocaleString("en-ZA")}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
