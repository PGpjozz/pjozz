"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { buttonVariants } from "@/components/ui/button";
import type { Campaign } from "@/types";

import { cn } from "@/lib/utils";
import { campaignStatusLabel, campaignTypeLabel } from "@/lib/campaigns/labels";

type ChartPoint = { label: string; sent: number; opened: number; replied: number };

export function OutreachDashboardClient() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [chart, setChart] = useState<ChartPoint[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/campaigns");
      const json = (await res.json()) as {
        ok: boolean;
        data?: { campaigns: Campaign[]; chart: ChartPoint[] };
      };
      if (json.ok && json.data) {
        setCampaigns(json.data.campaigns);
        setChart(json.data.chart);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
            Outreach campaigns
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Sequences, send windows, and Resend-powered delivery with open tracking.
          </p>
        </div>
        <Link href="/outreach/new" className={cn(buttonVariants({ variant: "default", size: "default" }), "shrink-0")}>
          New campaign
        </Link>
      </div>

      <div className="rounded-xl border border-border bg-card/30 p-4">
        <h2 className="font-heading text-sm font-semibold text-primary">Performance (all campaigns)</h2>
        <p className="mt-1 text-xs text-muted-foreground">Sent vs opened vs replied by day</p>
        <div className="mt-4 h-[280px] w-full min-w-0">
          {loading ? (
            <div className="flex h-full items-center justify-center font-mono text-sm text-muted-foreground">Loading…</div>
          ) : chart.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No events yet — launch a campaign.</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chart} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3a" />
                <XAxis dataKey="label" tick={{ fill: "#888", fontSize: 10 }} interval="preserveStartEnd" />
                <YAxis tick={{ fill: "#888", fontSize: 10 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: "#0a0a0a", border: "1px solid #2a2a3a", borderRadius: 8 }}
                  labelStyle={{ color: "#eee" }}
                />
                <Legend />
                <Bar dataKey="sent" name="Sent" fill="#1a1a2e" stroke="#00e5a0" strokeWidth={1} radius={[4, 4, 0, 0]} />
                <Bar dataKey="opened" name="Opened" fill="#00e5a0" fillOpacity={0.55} radius={[4, 4, 0, 0]} />
                <Bar dataKey="replied" name="Replied" fill="#38bdf8" fillOpacity={0.7} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-muted/20 font-mono text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Campaign</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Leads</th>
              <th className="px-4 py-3">Open %</th>
              <th className="px-4 py-3">Reply %</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                  Loading…
                </td>
              </tr>
            ) : campaigns.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                  No campaigns yet. Create one to get started.
                </td>
              </tr>
            ) : (
              campaigns.map((c) => (
                <tr key={c.id} className="border-b border-border/60 hover:bg-muted/10">
                  <td className="px-4 py-3 font-medium text-foreground">{c.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{campaignTypeLabel(c.type)}</td>
                  <td className="px-4 py-3 font-mono text-xs">{c.leadsCount}</td>
                  <td className="px-4 py-3 font-mono text-xs">{c.openRate}%</td>
                  <td className="px-4 py-3 font-mono text-xs">{c.replyRate}%</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-muted px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
                      {campaignStatusLabel(c.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/outreach/${c.id}`} className="text-primary hover:underline">
                      Open
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
