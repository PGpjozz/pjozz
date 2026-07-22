"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowRight, ExternalLink, KeyRound, History } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "pjozz_last_proposal_token";

/** Extract a share token from a raw paste (token alone or full /p/... URL). */
export function extractProposalToken(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // Full URL: https://host/p/TOKEN or /p/TOKEN?...
  try {
    if (trimmed.includes("://") || trimmed.startsWith("/")) {
      const url = trimmed.includes("://")
        ? new URL(trimmed)
        : new URL(trimmed, "https://example.invalid");
      const parts = url.pathname.split("/").filter(Boolean);
      const pIdx = parts.findIndex((p) => p === "p");
      if (pIdx >= 0 && parts[pIdx + 1]) {
        return decodeURIComponent(parts[pIdx + 1]);
      }
    }
  } catch {
    /* fall through */
  }

  // Bare token (uuid-ish / url-safe string)
  const bare = trimmed.replace(/^\/+/, "");
  if (/^[A-Za-z0-9_-]{12,200}$/.test(bare) && !bare.includes("/")) return bare;
  return null;
}

export function ClientHubClient() {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [lastToken, setLastToken] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setLastToken(saved);
    } catch {
      /* private mode */
    }
  }, []);

  const openWithToken = (token: string) => {
    try {
      localStorage.setItem(STORAGE_KEY, token);
    } catch {
      /* ignore */
    }
    setLastToken(token);
    router.push(`/p/${encodeURIComponent(token)}`);
  };

  const openProposal = () => {
    const token = extractProposalToken(input);
    if (!token) {
      setError("Paste the full proposal link from your email, or the token after /p/.");
      return;
    }
    setError(null);
    openWithToken(token);
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 md:px-6 md:py-24">
      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-cyan-400">Clients</p>
      <h1 className="mt-3 font-heading text-4xl font-semibold tracking-tight text-white">Client hub</h1>
      <p className="mt-4 text-slate-400">
        Open a secure proposal we emailed you. Accepting in-app notifies our team automatically — no passwords
        required here.
      </p>

      <div className="mt-10 rounded-2xl border border-white/[0.08] bg-[#0c1222] p-6 md:p-8">
        <div className="flex items-start gap-3">
          <KeyRound className="mt-0.5 h-5 w-5 shrink-0 text-cyan-400" aria-hidden />
          <div>
            <h2 className="font-heading text-lg font-semibold text-white">Open your proposal</h2>
            <p className="mt-1 text-sm text-slate-400">
              Paste the full link from your email, or just the token after{" "}
              <code className="rounded bg-white/10 px-1 font-mono text-xs text-cyan-200">/p/</code>.
            </p>
          </div>
        </div>
        <form
          className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-end"
          onSubmit={(e) => {
            e.preventDefault();
            openProposal();
          }}
        >
          <div className="min-w-0 flex-1">
            <label htmlFor="client-hub-token" className="text-xs uppercase tracking-wider text-slate-500">
              Proposal link or token
            </label>
            <input
              id="client-hub-token"
              className="mt-1 w-full rounded-lg border border-cyan-500/20 bg-white/[0.04] px-3 py-2.5 font-mono text-sm text-white placeholder:text-slate-500 focus-visible:border-cyan-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-cyan-400"
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                if (error) setError(null);
              }}
              placeholder="https://…/p/your-token  or  your-token"
              autoComplete="off"
              spellCheck={false}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? "client-hub-error" : undefined}
            />
          </div>
          <Button type="submit" disabled={!input.trim()} className="bg-cyan-600 text-white hover:bg-cyan-500">
            Open proposal
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Button>
        </form>
        {error ? (
          <p id="client-hub-error" role="alert" className="mt-3 text-sm text-rose-300">
            {error}
          </p>
        ) : null}

        {lastToken ? (
          <button
            type="button"
            onClick={() => openWithToken(lastToken)}
            className="mt-5 flex w-full items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5 text-left text-sm text-slate-300 transition hover:border-cyan-500/30 hover:text-cyan-200"
          >
            <History className="h-4 w-4 shrink-0 text-cyan-400" aria-hidden />
            <span className="min-w-0 flex-1 truncate">
              Reopen last proposal{" "}
              <span className="font-mono text-xs text-slate-500">…{lastToken.slice(-8)}</span>
            </span>
          </button>
        ) : null}
      </div>

      <div className="mt-10 space-y-4 text-sm text-slate-400">
        <p>
          <strong className="text-slate-200">Typical link format:</strong>{" "}
          <code className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-xs text-cyan-200">
            /p/&lt;your-token&gt;
          </code>
        </p>
        <p>
          Need scope changes before signing? Use <strong className="text-slate-200">Request changes</strong> on the
          proposal — it notifies our team in the CRM.
        </p>
        <p>
          Already a client and looking for project updates? Visit the{" "}
          <Link href="/portal" className="text-cyan-300 underline-offset-2 hover:underline">
            client portal
          </Link>
          .
        </p>
      </div>

      <div className="mt-12 flex flex-wrap gap-4 border-t border-white/10 pt-10">
        <Link
          href="/contact"
          className={cn(buttonVariants({ variant: "outline" }), "inline-flex items-center gap-2 border-white/15 text-white")}
        >
          New project enquiry <ExternalLink className="h-4 w-4 opacity-70" aria-hidden />
        </Link>
        <Link href="/services" className={cn(buttonVariants({ variant: "ghost" }), "text-slate-300")}>
          Browse services
        </Link>
      </div>
    </div>
  );
}
