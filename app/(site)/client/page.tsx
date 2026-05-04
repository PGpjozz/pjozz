"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { ExternalLink, KeyRound } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function ClientHubPage() {
  const router = useRouter();
  const [token, setToken] = useState("");

  const openProposal = () => {
    const t = token.trim();
    if (!t) return;
    router.push(`/p/${encodeURIComponent(t)}`);
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 md:px-6 md:py-24">
      <p className="text-sm font-medium uppercase tracking-widest text-primary">Clients</p>
      <h1 className="mt-3 font-heading text-4xl font-semibold tracking-tight text-foreground">Client hub</h1>
      <p className="mt-4 text-muted-foreground">
        Review proposals we send you via secure link. When you accept in-app, our team is notified automatically through
        the same system we use to deliver your project.
      </p>

      <div className="mt-10 rounded-xl border border-border bg-card/40 p-6 md:p-8">
        <div className="flex items-start gap-3">
          <KeyRound className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
          <div>
            <h2 className="font-heading text-lg font-semibold text-foreground">Open your proposal</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Paste the token from your email (the long code in the proposal link). We never ask for your operator
              password here.
            </p>
          </div>
        </div>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1">
            <label className="text-xs uppercase text-muted-foreground">Proposal token</label>
            <input
              className="pj-input mt-1 font-mono text-sm"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="From your secure link…"
              autoComplete="off"
            />
          </div>
          <Button type="button" onClick={() => openProposal()} disabled={!token.trim()}>
            Open proposal
          </Button>
        </div>
      </div>

      <div className="mt-10 space-y-4 text-sm text-muted-foreground">
        <p>
          <strong className="text-foreground">Typical link format:</strong>{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground/90">
            /p/&lt;your-token&gt;
          </code>{" "}
          — bookmark it or paste the token above.
        </p>
        <p>
          Need to change scope before signing? Use <strong className="text-foreground">Request changes</strong> on the
          proposal page — it notifies our team inside the CRM.
        </p>
      </div>

      <div className="mt-12 flex flex-wrap gap-4 border-t border-border pt-10">
        <Link
          href="/contact"
          className={cn(buttonVariants({ variant: "outline" }), "inline-flex items-center gap-2")}
        >
          New project enquiry <ExternalLink className="ml-2 h-4 w-4 opacity-70" aria-hidden />
        </Link>
        <Link href="/services" className={cn(buttonVariants({ variant: "ghost" }), "inline-flex items-center")}>
          Browse services
        </Link>
      </div>
    </div>
  );
}
