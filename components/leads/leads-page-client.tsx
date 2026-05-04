"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import type { LeadApi } from "@/lib/leads/mappers";
import type { LeadServiceType, LeadStatus } from "@/types";

import { AddLeadModal } from "./AddLeadModal";
import { DiscoverLeadsModal } from "./DiscoverLeadsModal";
import { LeadDetailView } from "./lead-detail-view";
import { LeadScoreBadge } from "./LeadScoreBadge";
import { SERVICE_LABEL } from "./lead-constants";
import { StatusBadge } from "./StatusBadge";

type Stats = { total: number; newToday: number; qualified: number; avgScore: number };

const STATUSES: LeadStatus[] = [
  "new",
  "contacted",
  "qualified",
  "meeting",
  "proposal",
  "won",
  "lost",
];
const SERVICES: LeadServiceType[] = [
  "webapp",
  "mobileapp",
  "automation",
  "network",
  "security_cam",
  "software",
];
const SORTS = ["created_at", "updated_at", "lead_score", "company_name"] as const;

export function LeadsPageClient() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [leads, setLeads] = useState<LeadApi[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 25;
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<LeadStatus | "">("");
  const [serviceType, setServiceType] = useState<LeadServiceType | "">("");
  const [minScore, setMinScore] = useState("");
  const [maxScore, setMaxScore] = useState("");
  const [sort, setSort] = useState<(typeof SORTS)[number]>("created_at");
  const [order, setOrder] = useState<"asc" | "desc">("desc");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sheetId, setSheetId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [discoverOpen, setDiscoverOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [bulkStatus, setBulkStatus] = useState<LeadStatus>("contacted");

  const qs = useMemo(() => {
    const p = new URLSearchParams();
    if (search.trim()) p.set("search", search.trim());
    if (status) p.set("status", status);
    if (serviceType) p.set("serviceType", serviceType);
    if (minScore !== "") p.set("minScore", minScore);
    if (maxScore !== "") p.set("maxScore", maxScore);
    p.set("sort", sort);
    p.set("order", order);
    p.set("page", String(page));
    p.set("pageSize", String(pageSize));
    return p.toString();
  }, [search, status, serviceType, minScore, maxScore, sort, order, page]);

  const loadStats = useCallback(async () => {
    const res = await fetch("/api/leads/stats");
    const json = (await res.json()) as { ok: boolean; data?: Stats };
    if (json.ok && json.data) setStats(json.data);
  }, []);

  const loadLeads = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/leads?${qs}`);
      const json = (await res.json()) as {
        ok: boolean;
        data?: { leads: LeadApi[]; total: number; page: number };
      };
      if (json.ok && json.data) {
        setLeads(json.data.leads);
        setTotal(json.data.total);
      }
    } finally {
      setLoading(false);
    }
  }, [qs]);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  useEffect(() => {
    void loadLeads();
  }, [loadLeads]);

  const pages = Math.max(1, Math.ceil(total / pageSize));

  function toggleRow(id: string) {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  function toggleAllPage() {
    const ids = leads.map((l) => l.id);
    const allOn = ids.every((id) => selected.has(id));
    setSelected((prev) => {
      const n = new Set(prev);
      if (allOn) ids.forEach((id) => n.delete(id));
      else ids.forEach((id) => n.add(id));
      return n;
    });
  }

  async function runBulk(action: "set_status" | "export_csv" | "mailto") {
    const ids = Array.from(selected);
    if (!ids.length) return;
    if (action === "mailto") {
      const res = await fetch("/api/leads/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "mailto", ids }),
      });
      const json = (await res.json()) as { ok: boolean; data?: { emails: string[] } };
      if (json.ok && json.data?.emails?.length) {
        window.location.href = `mailto:?bcc=${encodeURIComponent(json.data.emails.join(","))}`;
      }
      return;
    }
    if (action === "export_csv") {
      const res = await fetch("/api/leads/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "export_csv", ids }),
      });
      const json = (await res.json()) as { ok: boolean; data?: { csv: string } };
      if (json.ok && json.data?.csv) {
        const blob = new Blob([json.data.csv], { type: "text/csv;charset=utf-8" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `pjozz-leads-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(a.href);
      }
      return;
    }
    const res = await fetch("/api/leads/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "set_status", ids, status: bulkStatus }),
    });
    if (res.ok) {
      setSelected(new Set());
      void loadLeads();
      void loadStats();
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
            Lead management
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            High-contrast operator view — qualify, score, and move deals fast.
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)} className="shrink-0 self-start">
          Add lead
        </Button>
      </div>

      <div className="rounded-xl border border-primary/35 bg-gradient-to-br from-primary/10 to-background p-4 md:p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <p className="font-heading text-base font-semibold tracking-tight text-foreground">
              Find SMBs &amp; startups on the web
            </p>
            <p className="mt-1 max-w-xl text-sm text-muted-foreground">
              Opens a search tool (Google). Look for South African startups and small businesses you can serve — then
              import them here. Configure{" "}
              <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">GOOGLE_CSE_*</code> in{" "}
              <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">.env.local</code> if discovery is
              disabled.
            </p>
          </div>
          <Button
            size="lg"
            className="h-11 shrink-0 gap-2 px-5 md:min-w-[220px]"
            onClick={() => setDiscoverOpen(true)}
            title="Search the web for startups and small businesses"
          >
            <Search className="h-4 w-4 shrink-0" aria-hidden />
            Find SMBs / startups
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Total leads" value={stats?.total ?? "—"} />
        <Stat label="New today" value={stats?.newToday ?? "—"} accent />
        <Stat label="Qualified" value={stats?.qualified ?? "—"} />
        <Stat label="Avg score" value={stats != null ? String(stats.avgScore) : "—"} />
      </div>

      <div className="rounded-xl border border-border bg-card/30 p-4 backdrop-blur">
        <div className="grid gap-3 lg:grid-cols-6">
          <div className="lg:col-span-2">
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Search
            </label>
            <input
              className="pj-input font-mono text-sm"
              placeholder="Company, contact, email…"
              value={search}
              onChange={(e) => {
                setPage(1);
                setSearch(e.target.value);
              }}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Status
            </label>
            <select
              className="pj-input font-mono text-sm"
              value={status}
              onChange={(e) => {
                setPage(1);
                setStatus(e.target.value as LeadStatus | "");
              }}
            >
              <option value="">All</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Service
            </label>
            <select
              className="pj-input font-mono text-sm"
              value={serviceType}
              onChange={(e) => {
                setPage(1);
                setServiceType(e.target.value as LeadServiceType | "");
              }}
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
              Score min
            </label>
            <input
              className="pj-input font-mono text-sm"
              type="number"
              min={0}
              max={100}
              value={minScore}
              onChange={(e) => {
                setPage(1);
                setMinScore(e.target.value);
              }}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Score max
            </label>
            <input
              className="pj-input font-mono text-sm"
              type="number"
              min={0}
              max={100}
              value={maxScore}
              onChange={(e) => {
                setPage(1);
                setMaxScore(e.target.value);
              }}
            />
          </div>
          <div className="grid grid-cols-2 gap-2 lg:col-span-6">
            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Sort
              </label>
              <select
                className="pj-input font-mono text-sm"
                value={sort}
                onChange={(e) => setSort(e.target.value as (typeof SORTS)[number])}
              >
                {SORTS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Order
              </label>
              <select
                className="pj-input font-mono text-sm"
                value={order}
                onChange={(e) => setOrder(e.target.value as "asc" | "desc")}
              >
                <option value="desc">Desc</option>
                <option value="asc">Asc</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {selected.size > 0 ? (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-primary/40 bg-primary/5 px-4 py-3 text-sm">
          <span className="font-mono text-primary">{selected.size} selected</span>
          <select
            className="pj-input w-auto py-1 text-xs"
            value={bulkStatus}
            onChange={(e) => setBulkStatus(e.target.value as LeadStatus)}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                Set → {s}
              </option>
            ))}
          </select>
          <Button size="sm" variant="secondary" onClick={() => void runBulk("set_status")}>
            Apply status
          </Button>
          <Button size="sm" variant="outline" onClick={() => void runBulk("mailto")}>
            Bulk email
          </Button>
          <Button size="sm" variant="outline" onClick={() => void runBulk("export_csv")}>
            Export CSV
          </Button>
          <button type="button" className="ml-auto text-xs text-muted-foreground underline" onClick={() => setSelected(new Set())}>
            Clear
          </button>
        </div>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-border bg-[#0A0A0A] shadow-inner">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-left font-mono text-sm">
            <thead>
              <tr className="border-b border-border bg-[#1A1A2E]/80 text-xs uppercase tracking-wider text-muted-foreground">
                <th className="w-10 px-3 py-3">
                  <input type="checkbox" checked={leads.length > 0 && leads.every((l) => selected.has(l.id))} onChange={toggleAllPage} />
                </th>
                <th className="px-3 py-3">Company</th>
                <th className="px-3 py-3">Contact</th>
                <th className="px-3 py-3">Service</th>
                <th className="px-3 py-3">Score</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3">Source</th>
                <th className="px-3 py-3">Last activity</th>
                <th className="px-3 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-3 py-12 text-center text-muted-foreground">
                    Loading…
                  </td>
                </tr>
              ) : leads.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-3 py-12 text-center text-muted-foreground">
                    No leads match filters.
                  </td>
                </tr>
              ) : (
                leads.map((l) => (
                  <tr
                    key={l.id}
                    className="border-b border-border/60 hover:bg-[#1A1A2E]/40 cursor-pointer"
                    onClick={() => setSheetId(l.id)}
                  >
                    <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" checked={selected.has(l.id)} onChange={() => toggleRow(l.id)} />
                    </td>
                    <td className="px-3 py-2 font-medium text-foreground">{l.companyName}</td>
                    <td className="px-3 py-2 text-muted-foreground">{l.contactName ?? "—"}</td>
                    <td className="px-3 py-2 text-xs text-primary/90">
                      {l.serviceType ? SERVICE_LABEL[l.serviceType] ?? l.serviceType : "—"}
                    </td>
                    <td className="px-3 py-2">
                      <LeadScoreBadge score={l.leadScore} size="sm" />
                    </td>
                    <td className="px-3 py-2">
                      <StatusBadge status={l.status} />
                    </td>
                    <td className="max-w-[140px] truncate px-3 py-2 text-xs text-muted-foreground">{l.source ?? "—"}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-xs text-muted-foreground">
                      {new Date(l.lastActivityAt).toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-right" onClick={(e) => e.stopPropagation()}>
                      <Link href={`/leads/${l.id}`} className="text-xs text-primary hover:underline">
                        Open
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-border px-4 py-3 text-xs text-muted-foreground">
          <span className="font-mono">
            Page {page} / {pages} · {total} total
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
              Prev
            </Button>
            <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>
              Next
            </Button>
          </div>
        </div>
      </div>

      <AddLeadModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onCreated={(id) => {
          setSheetId(id);
          void loadLeads();
          void loadStats();
        }}
      />

      <DiscoverLeadsModal
        open={discoverOpen}
        onClose={() => setDiscoverOpen(false)}
        onImported={() => {
          void loadLeads();
          void loadStats();
        }}
      />

      {sheetId ? (
        <LeadDetailView
          leadId={sheetId}
          mode="sheet"
          onClose={() => setSheetId(null)}
          onUpdated={() => {
            void loadLeads();
            void loadStats();
          }}
        />
      ) : null}
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string | number; accent?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-card/40 px-4 py-3",
        accent && "border-primary/40 bg-primary/5"
      )}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={cn("mt-1 font-heading text-2xl font-semibold tabular-nums", accent ? "text-primary" : "text-foreground")}>
        {value}
      </p>
    </div>
  );
}
