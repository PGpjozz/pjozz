"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import type { Tables } from "@/lib/db/supabase";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type InsightRow = Tables<"ai_insights">;

function priorityBadge(p: InsightRow["priority"]) {
  switch (p) {
    case "critical":
      return "bg-red-600/20 text-red-400 border-red-500/40";
    case "high":
      return "bg-orange-600/20 text-orange-300 border-orange-500/40";
    case "medium":
      return "bg-amber-600/15 text-amber-200 border-amber-500/35";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

export function AIInsightsPanel({
  className,
  refreshToken = 0,
}: {
  className?: string;
  /** Increment when the daily brief is regenerated so unread insights reload. */
  refreshToken?: number;
}) {
  const [insights, setInsights] = useState<InsightRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const res = await fetch("/api/ai/insights?unread=true");
    const json = (await res.json()) as { ok: boolean; data?: { insights: InsightRow[] } };
    if (json.ok && json.data) setInsights(json.data.insights);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void load();
  }, [refreshToken, load]);

  useEffect(() => {
    const t = window.setInterval(() => void load(), 30 * 60 * 1000);
    return () => window.clearInterval(t);
  }, [load]);

  const markAll = async () => {
    const res = await fetch("/api/ai/insights/mark-read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    });
    const json = (await res.json()) as { ok: boolean };
    if (json.ok) {
      toast.success("Marked all read");
      await load();
    } else toast.error("Could not update insights");
  };

  const markOne = async (id: string) => {
    await fetch("/api/ai/insights/mark-read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    await load();
  };

  return (
    <aside className={cn("flex flex-col rounded-xl border border-border bg-card/40", className)}>
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h3 className="font-heading text-sm font-semibold text-foreground">AI insights</h3>
        <Button type="button" variant="ghost" size="sm" className="h-8 text-xs" onClick={() => void markAll()}>
          Mark all read
        </Button>
      </div>
      <div className="max-h-[min(70vh,640px)] flex-1 space-y-3 overflow-y-auto p-4">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="animate-pulse rounded-lg border border-border bg-muted/30 p-3">
                <div className="mb-2 h-4 w-16 rounded bg-muted" />
                <div className="h-3 w-full rounded bg-muted" />
                <div className="mt-2 h-3 w-[80%] rounded bg-muted" />
              </div>
            ))}
          </div>
        ) : insights.length === 0 ? (
          <p className="text-sm text-muted-foreground">No unread insights. Run the daily brief to generate more.</p>
        ) : (
          <>
          {insights.map((row) => (
            <div key={row.id} className="rounded-lg border border-border bg-background/40 p-3">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    "rounded border px-1.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wide",
                    priorityBadge(row.priority)
                  )}
                >
                  {row.priority}
                </span>
                {row.type ? (
                  <span className="font-mono text-[10px] text-muted-foreground">{row.type.replace(/_/g, " ")}</span>
                ) : null}
              </div>
              <p className="text-sm leading-relaxed text-foreground/95">{row.message}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {row.related_id && row.related_type === "lead" ? (
                  <Link
                    href={`/leads/${row.related_id}`}
                    className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-8 text-xs")}
                    onClick={() => void markOne(row.id)}
                  >
                    View lead
                  </Link>
                ) : null}
                {row.related_id && row.related_type === "lead" ? (
                  <Link
                    href={`/leads/${row.related_id}`}
                    className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-8 text-xs")}
                    onClick={() => void markOne(row.id)}
                  >
                    Draft email
                  </Link>
                ) : (
                  <Link
                    href="/outreach"
                    className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-8 text-xs")}
                    onClick={() => void markOne(row.id)}
                  >
                    Draft email
                  </Link>
                )}
                <Link
                  href="/pipeline"
                  className={cn(buttonVariants({ variant: "secondary", size: "sm" }), "h-8 text-xs")}
                  onClick={() => void markOne(row.id)}
                >
                  Check pipeline
                </Link>
              </div>
            </div>
          ))}
          <p className="text-[10px] leading-relaxed text-muted-foreground">
            Unread list refetches every 30 minutes. The dashboard re-fetches the daily brief on the same schedule; the server may return a cached brief until it expires or you regenerate, to reduce Claude API usage.
          </p>
          </>
        )}
      </div>
    </aside>
  );
}
