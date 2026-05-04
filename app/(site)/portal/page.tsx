"use client";

import Link from "next/link";
import { FileText, FolderOpen, LayoutDashboard, MessageSquare } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Frontend-only preview — wire to Supabase Auth + row-level client access later */
export default function ClientPortalPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 md:px-6 md:py-16">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-violet-400">Client portal</p>
          <h1 className="mt-2 font-heading text-3xl font-semibold text-white md:text-4xl">Project workspace</h1>
          <p className="mt-2 max-w-xl text-sm text-slate-400">
            Preview UI only — authentication and live data will connect to your CRM records next.
          </p>
        </div>
        <Link
          href="/client"
          className={cn(buttonVariants({ variant: "outline" }), "border-cyan-500/30 text-cyan-200")}
        >
          Open proposal link
        </Link>
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-4">
        <aside className="rounded-2xl border border-white/[0.08] bg-[#0c1222] p-4 lg:col-span-1">
          <nav className="space-y-1 text-sm">
            <button type="button" className="flex w-full items-center gap-2 rounded-lg bg-cyan-500/15 px-3 py-2 text-left text-cyan-200">
              <LayoutDashboard className="h-4 w-4" aria-hidden />
              Overview
            </button>
            <button type="button" className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-slate-400 hover:bg-white/5">
              <FolderOpen className="h-4 w-4" aria-hidden />
              Deliverables
            </button>
            <button type="button" className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-slate-400 hover:bg-white/5">
              <MessageSquare className="h-4 w-4" aria-hidden />
              Messages
            </button>
            <button type="button" className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-slate-400 hover:bg-white/5">
              <FileText className="h-4 w-4" aria-hidden />
              Files
            </button>
          </nav>
        </aside>

        <div className="space-y-6 lg:col-span-3">
          <section className="rounded-2xl border border-white/[0.08] bg-[#0c1222] p-6">
            <h2 className="font-heading text-lg font-semibold text-white">Project status</h2>
            <div className="mt-4 space-y-3">
              {["Discovery", "Build", "UAT", "Go-live"].map((s, i) => (
                <div key={s} className="flex items-center gap-3">
                  <span
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-full text-xs font-mono",
                      i < 2 ? "bg-cyan-500/20 text-cyan-200" : "bg-white/5 text-slate-500"
                    )}
                  >
                    {i + 1}
                  </span>
                  <span className={i < 2 ? "text-slate-200" : "text-slate-500"}>{s}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-white/[0.08] bg-[#0c1222] p-6">
              <h2 className="font-heading text-sm font-semibold uppercase tracking-wider text-slate-500">Messages</h2>
              <div className="mt-4 space-y-3 text-sm text-slate-400">
                <p className="rounded-lg border border-white/5 bg-white/[0.02] p-3 text-slate-300">
                  <span className="text-xs text-cyan-500/90">Pjozz · 2d ago</span>
                  <br />
                  UAT build is on staging — review link in your email.
                </p>
                <p className="text-xs text-slate-500">End-to-end chat will connect to the same thread we use internally.</p>
              </div>
            </div>
            <div className="rounded-2xl border border-white/[0.08] bg-[#0c1222] p-6">
              <h2 className="font-heading text-sm font-semibold uppercase tracking-wider text-slate-500">Files</h2>
              <ul className="mt-4 space-y-2 text-sm text-slate-400">
                <li className="flex justify-between rounded border border-white/5 px-3 py-2">
                  <span>SOW_v2.pdf</span>
                  <span className="text-xs text-slate-600">Soon</span>
                </li>
                <li className="flex justify-between rounded border border-white/5 px-3 py-2">
                  <span>Architecture.pdf</span>
                  <span className="text-xs text-slate-600">Soon</span>
                </li>
              </ul>
            </div>
          </section>

          <div className="rounded-xl border border-dashed border-violet-500/30 bg-violet-950/10 p-4 text-center text-sm text-slate-400">
            Want this live for your account? We&apos;ll tie rows to <code className="font-mono text-violet-300">clients</code> /{" "}
            <code className="font-mono text-violet-300">proposals</code> with Supabase Auth.
          </div>
        </div>
      </div>
    </div>
  );
}
