"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type LeadMini = { company_name: string } | null;

type ProposalRow = {
  id: string;
  title: string;
  total_value: number | null;
  status: string;
  created_at: string;
  share_token: string | null;
  leads: LeadMini | { company_name: string } | null;
};

const STATUS_STYLE: Record<string, string> = {
  draft: "bg-zinc-500/20 text-zinc-200 ring-zinc-500/40",
  sent: "bg-sky-500/20 text-sky-100 ring-sky-500/40",
  accepted: "bg-emerald-500/20 text-emerald-100 ring-emerald-500/40",
  rejected: "bg-red-500/20 text-red-100 ring-red-500/40",
  expired: "bg-amber-500/20 text-amber-100 ring-amber-500/40",
};

export function ProposalsListClient() {
  const [rows, setRows] = useState<ProposalRow[]>([]);
  const [stats, setStats] = useState<{
    totalSent: number;
    acceptanceRate: number | null;
    totalWonValueZar: number;
    avgDealSizeZar: number | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/proposals");
      const json = (await res.json()) as {
        ok: boolean;
        data?: {
          proposals: ProposalRow[];
          stats: { totalSent: number; acceptanceRate: number | null; totalWonValueZar: number; avgDealSizeZar: number | null };
        };
      };
      if (json.ok && json.data) {
        setRows(json.data.proposals);
        setStats(json.data.stats);
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
          <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground md:text-3xl">Proposals</h1>
          <p className="mt-1 text-sm text-muted-foreground">AI-generated scopes, pricing tiers, and client-ready PDFs.</p>
        </div>
        <Link href="/proposals/new" className={cn(buttonVariants({ variant: "default", size: "default" }), "shrink-0")}>
          New proposal
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Total sent (non-draft)" value={stats != null ? String(stats.totalSent) : "—"} />
        <Stat label="Acceptance rate" value={stats?.acceptanceRate != null ? `${stats.acceptanceRate}%` : "—"} accent />
        <Stat label="Total won (ZAR)" value={stats != null ? `R ${stats.totalWonValueZar.toLocaleString("en-ZA")}` : "—"} />
        <Stat label="Avg deal (accepted)" value={stats?.avgDealSizeZar != null ? `R ${stats.avgDealSizeZar.toLocaleString("en-ZA")}` : "—"} />
      </div>

      <div className="overflow-hidden rounded-xl border border-border">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-muted/20 font-mono text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Client</th>
              <th className="px-4 py-3">Value</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Created</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  Loading…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  No proposals yet.
                </td>
              </tr>
            ) : (
              rows.map((p) => {
                const client = p.leads && !Array.isArray(p.leads) ? p.leads.company_name : "—";
                return (
                  <tr key={p.id} className="border-b border-border/60 hover:bg-muted/10">
                    <td className="px-4 py-3 font-medium text-foreground">{p.title}</td>
                    <td className="px-4 py-3 text-muted-foreground">{client}</td>
                    <td className="px-4 py-3 font-mono text-xs">
                      {p.total_value != null ? `R ${Number(p.total_value).toLocaleString("en-ZA")}` : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "inline-flex rounded-full px-2 py-0.5 font-mono text-[10px] ring-1",
                          STATUS_STYLE[p.status] ?? STATUS_STYLE.draft
                        )}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-muted-foreground">
                      {new Date(p.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <Link href={`/proposals/new?id=${p.id}`} className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>
                          Edit
                        </Link>
                        {p.share_token ? (
                          <a
                            href={`/p/${encodeURIComponent(p.share_token)}`}
                            target="_blank"
                            rel="noreferrer"
                            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                          >
                            View
                          </a>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
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
