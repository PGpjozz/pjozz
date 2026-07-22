"use client";

import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  FileText,
  FolderOpen,
  KeyRound,
  LayoutDashboard,
  MessageSquare,
} from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { whatsappHref } from "@/lib/marketing/links";
import { cn } from "@/lib/utils";

const STEPS = [
  {
    title: "Receive a secure link",
    body: "When we send a proposal, you get a private /p/… link by email — no account required.",
    icon: KeyRound,
  },
  {
    title: "Review & download",
    body: "Open the proposal, download the PDF or quote sheet, and request changes if needed.",
    icon: FileText,
  },
  {
    title: "Accept to kick off",
    body: "Accepting notifies our team instantly and starts invoice + delivery planning.",
    icon: CheckCircle2,
  },
] as const;

const COMING = [
  { label: "Overview", icon: LayoutDashboard, note: "Live project phase & milestones" },
  { label: "Deliverables", icon: FolderOpen, note: "Signed SOW items tracked to done" },
  { label: "Messages", icon: MessageSquare, note: "Same thread our operators use" },
  { label: "Files", icon: FileText, note: "Shared docs & handoff packs" },
] as const;

/** Production-ready client workspace entry — proposals live today; deeper auth later. */
export function PortalPreviewClient() {
  const wa = whatsappHref();

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 md:px-6 md:py-16">
      <div className="max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-violet-400">Client portal</p>
        <h1 className="mt-2 font-heading text-3xl font-semibold text-white md:text-4xl">Your project workspace</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-400 md:text-base">
          Review proposals, download PDFs, and kick off projects through the same system our delivery team uses — without
          an operator login.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/client"
            className={cn(buttonVariants({ size: "lg" }), "gap-2 bg-cyan-600 text-white hover:bg-cyan-500")}
          >
            Open a proposal <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
          <a
            href={wa}
            target="_blank"
            rel="noreferrer"
            className={cn(buttonVariants({ variant: "outline", size: "lg" }), "border-cyan-500/30 text-cyan-200")}
          >
            WhatsApp the team
          </a>
        </div>
      </div>

      <section className="mt-14">
        <h2 className="font-heading text-xl font-semibold text-white">How it works today</h2>
        <ol className="mt-6 grid gap-4 md:grid-cols-3">
          {STEPS.map(({ title, body, icon: Icon }, i) => (
            <li
              key={title}
              className="rounded-2xl border border-white/[0.08] bg-[#0c1222] p-5"
            >
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-cyan-500/15 font-mono text-xs text-cyan-200">
                {i + 1}
              </span>
              <Icon className="mt-4 h-5 w-5 text-violet-300" aria-hidden />
              <h3 className="mt-3 font-heading text-base font-semibold text-white">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">{body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-14 rounded-2xl border border-white/[0.08] bg-[#0c1222] p-6 md:p-8">
        <h2 className="font-heading text-xl font-semibold text-white">After kickoff</h2>
        <p className="mt-2 max-w-2xl text-sm text-slate-400">
          Once your project is live, this portal expands into a signed-in workspace. Until then, everything you need for
          proposals is available through your secure link.
        </p>
        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {COMING.map(({ label, icon: Icon, note }) => (
            <li
              key={label}
              className="flex items-start gap-3 rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3"
            >
              <Icon className="mt-0.5 h-4 w-4 shrink-0 text-cyan-400" aria-hidden />
              <div>
                <p className="text-sm font-medium text-slate-200">{label}</p>
                <p className="text-xs text-slate-500">{note}</p>
              </div>
            </li>
          ))}
        </ul>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/client" className={cn(buttonVariants(), "bg-violet-600 text-white hover:bg-violet-500")}>
            Go to client hub
          </Link>
          <Link
            href="/contact"
            className={cn(buttonVariants({ variant: "ghost" }), "text-slate-300")}
          >
            Need a project update?
          </Link>
        </div>
      </section>
    </div>
  );
}
