"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { STARTUP_SMB_PRESETS } from "@/lib/leads/discovery-presets";
import type { LeadServiceType } from "@/types";

const SERVICES: LeadServiceType[] = [
  "webapp",
  "mobileapp",
  "automation",
  "network",
  "security_cam",
  "software",
];

export type DiscoveredCandidate = {
  id: string;
  companyName: string;
  websiteUrl: string;
  snippet: string;
  displayHost: string;
  suggestedEmail: string | null;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onImported?: () => void;
};

export function DiscoverLeadsModal({ open, onClose, onImported }: Props) {
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [query, setQuery] = useState("");
  const [candidates, setCandidates] = useState<DiscoveredCandidate[]>([]);
  const [emails, setEmails] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [serviceTypes, setServiceTypes] = useState<LeadServiceType[]>(["webapp"]);
  const [busy, setBusy] = useState<"search" | "import" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<string | null>(null);

  const loadConfig = useCallback(async () => {
    const res = await fetch("/api/leads/discover");
    const json = (await res.json()) as { ok: boolean; data?: { configured: boolean } };
    if (json.ok && json.data) setConfigured(json.data.configured);
  }, []);

  useEffect(() => {
    if (open) void loadConfig();
  }, [open, loadConfig]);

  useEffect(() => {
    if (!open) {
      setImportResult(null);
      setError(null);
    }
  }, [open]);

  function toggleService(s: LeadServiceType) {
    setServiceTypes((prev) => {
      if (prev.includes(s)) {
        const next = prev.filter((x) => x !== s);
        return next.length ? next : [s];
      }
      return [...prev, s];
    });
  }

  async function runSearch() {
    setError(null);
    setImportResult(null);
    const q = query.trim();
    if (q.length < 2) {
      setError("Enter a search query or pick a preset below (startups & SMBs in South Africa).");
      return;
    }
    setBusy("search");
    try {
      const res = await fetch("/api/leads/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "search", query: q, maxResults: 10 }),
      });
      const json = (await res.json()) as {
        ok: boolean;
        data?: { candidates: DiscoveredCandidate[] };
        error?: string;
      };
      if (!res.ok || !json.ok || !json.data) {
        throw new Error(json.error ?? "Search failed");
      }
      const list = json.data.candidates;
      setCandidates(list);
      const nextEmails: Record<string, string> = {};
      for (const c of list) {
        nextEmails[c.id] = c.suggestedEmail ?? "";
      }
      setEmails(nextEmails);
      setSelected(new Set(list.map((c) => c.id)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Search failed");
      setCandidates([]);
    } finally {
      setBusy(null);
    }
  }

  async function runImport() {
    setError(null);
    setImportResult(null);
    const ids = Array.from(selected);
    if (!ids.length) {
      setError("Select at least one row.");
      return;
    }
    const items: {
      companyName: string;
      email: string;
      website: string | null;
      snippet: string;
    }[] = [];
    for (const id of ids) {
      const c = candidates.find((x) => x.id === id);
      if (!c) continue;
      const email = (emails[id] ?? "").trim().toLowerCase();
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        setError(`Valid email required for: ${c.companyName}`);
        return;
      }
      items.push({
        companyName: c.companyName,
        email,
        website: c.websiteUrl || null,
        snippet: c.snippet,
      });
    }
    if (!items.length) return;

    setBusy("import");
    try {
      const res = await fetch("/api/leads/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "import",
          serviceTypes,
          items,
        }),
      });
      const json = (await res.json()) as {
        ok: boolean;
        data?: {
          createdCount: number;
          skipped: { reason: string; email?: string; website?: string }[];
        };
        error?: string;
      };
      if (!res.ok || !json.ok || !json.data) {
        throw new Error(json.error ?? "Import failed");
      }
      const { createdCount, skipped } = json.data;
      setImportResult(
        `Imported ${createdCount} lead(s).` +
          (skipped.length ? ` Skipped ${skipped.length} (already in CRM or duplicate).` : "")
      );
      onImported?.();
      setCandidates([]);
      setSelected(new Set());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed");
    } finally {
      setBusy(null);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        aria-label="Close"
        onClick={onClose}
      />
      <div
        className={cn(
          "relative z-10 max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl border border-border bg-card p-6 shadow-lg"
        )}
      >
        <h2 className="font-heading text-lg font-semibold text-foreground">
          Find startups &amp; small businesses
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Pjozz searches the public web (via Google) for companies that might need{" "}
          <strong className="font-medium text-foreground/90">web apps, mobile, automation, networks, or security</strong>.
          You review each result, match it to a service you can offer, fix the email if needed, then import into the CRM.
          You must use results lawfully (e.g. POPIA) and only contact businesses in line with your policies.
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          Technical: uses Google Programmable Search — set API keys in <code className="text-[10px]">.env.local</code>. We
          prefill <code className="text-[10px]">info@domain</code> when the site domain allows; always verify before
          outreach.
        </p>

        {configured === false && (
          <p className="mt-3 rounded-lg border border-amber-500/30 bg-amber-950/20 p-3 text-sm text-amber-100">
            Discovery is not configured. Add{" "}
            <code className="rounded bg-muted px-1 text-xs">GOOGLE_CSE_API_KEY</code> and{" "}
            <code className="rounded bg-muted px-1 text-xs">GOOGLE_CSE_CX</code> to{" "}
            <code className="rounded bg-muted px-1 text-xs">.env.local</code> and restart the dev server.
          </p>
        )}

        <div className="mt-4">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Start here — who do you want to find?
          </p>
          <div className="flex max-h-40 flex-col gap-1.5 overflow-y-auto rounded-lg border border-border bg-muted/20 p-2 sm:max-h-none sm:flex-row sm:flex-wrap">
            {STARTUP_SMB_PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                title={p.hint}
                onClick={() => {
                  setQuery(p.query);
                  setServiceTypes(p.suggestServices);
                  setError(null);
                  setImportResult(null);
                }}
                disabled={busy !== null}
                className={cn(
                  "whitespace-nowrap rounded-md border border-border bg-background/80 px-2.5 py-1.5 text-left text-xs font-medium text-foreground transition-colors hover:border-primary/50 hover:bg-primary/5",
                  busy !== null && "pointer-events-none opacity-50"
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-[11px] leading-snug text-muted-foreground">
            Tip: click a preset to fill the query and suggested services — then edit the query (add a city, niche, or
            “startup”) before searching.
          </p>
        </div>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1">
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Search query (sent to Google)
            </label>
            <input
              className="pj-input font-mono text-sm"
              placeholder="e.g. boutique hotel Pretoria WiFi OR fintech startup Cape Town SME"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              disabled={busy !== null}
            />
          </div>
          <Button type="button" onClick={() => void runSearch()} disabled={busy !== null || configured === false}>
            {busy === "search" ? "Searching…" : "Search web"}
          </Button>
        </div>

        <div className="mt-4">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Pjozz services to tag on import (match what you can sell them)
          </p>
          <div className="flex flex-wrap gap-2">
            {SERVICES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => toggleService(s)}
                className={cn(
                  "rounded-lg border px-2 py-1 text-xs font-medium transition-colors",
                  serviceTypes.includes(s)
                    ? "border-primary bg-primary/15 text-foreground"
                    : "border-border bg-muted/30 text-muted-foreground hover:bg-muted/50"
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <p className="mt-3 text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
        {importResult && <p className="mt-3 text-sm text-emerald-400">{importResult}</p>}

        {candidates.length > 0 && (
          <div className="mt-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-muted-foreground">{candidates.length} result(s)</p>
              <Button type="button" size="sm" onClick={() => void runImport()} disabled={busy !== null}>
                {busy === "import" ? "Importing…" : `Import selected (${selected.size})`}
              </Button>
            </div>
            <ul className="space-y-2">
              {candidates.map((c) => (
                <li
                  key={c.id}
                  className="rounded-lg border border-border bg-muted/20 p-3 text-sm"
                >
                  <label className="flex cursor-pointer gap-2">
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={selected.has(c.id)}
                      onChange={() =>
                        setSelected((prev) => {
                          const n = new Set(prev);
                          if (n.has(c.id)) n.delete(c.id);
                          else n.add(c.id);
                          return n;
                        })
                      }
                    />
                    <span className="min-w-0 flex-1 space-y-2">
                      <span className="font-medium text-foreground">{c.companyName}</span>
                      <span className="block truncate font-mono text-xs text-muted-foreground">{c.websiteUrl}</span>
                      <span className="line-clamp-2 block text-xs text-muted-foreground">{c.snippet}</span>
                      <div className="flex flex-col gap-1 sm:flex-row sm:items-center">
                        <span className="shrink-0 text-xs text-muted-foreground">Email</span>
                        <input
                          className="pj-input flex-1 font-mono text-xs"
                          placeholder="required — verify before outreach"
                          value={emails[c.id] ?? ""}
                          onChange={(e) =>
                            setEmails((prev) => ({
                              ...prev,
                              [c.id]: e.target.value,
                            }))
                          }
                        />
                      </div>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
