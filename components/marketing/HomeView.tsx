"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BarChart3,
  Bot,
  Camera,
  Cpu,
  Layers,
  MessageSquare,
  Network,
  Sparkles,
  Zap,
} from "lucide-react";

import { Reveal } from "@/components/marketing/Reveal";
import { whatsappHref } from "@/lib/marketing/links";
import { testimonials } from "@/lib/marketing/content";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const OVERVIEW = [
  { title: "AI Systems", desc: "Grounded LLM workflows, scoring, and copilots.", icon: Cpu },
  { title: "Automation", desc: "Orchestration across CRM, finance, and ops.", icon: Zap },
  { title: "Web & Apps", desc: "Customer portals and operator dashboards.", icon: Layers },
  { title: "Networks & CCTV", desc: "Connectivity + surveillance that survives reality.", icon: Network },
] as const;

export function HomeView() {
  const wa = whatsappHref();

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-cyan-500/10">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_60%_at_50%_-30%,rgba(34,211,238,0.18),transparent)]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_50%_40%_at_100%_0%,rgba(167,139,250,0.14),transparent)]" />
        <div className="relative mx-auto max-w-6xl px-4 pb-20 pt-16 md:px-6 md:pb-28 md:pt-24">
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-4xl"
          >
            <p className="inline-flex items-center gap-2 rounded-full border border-cyan-500/25 bg-cyan-500/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-cyan-300">
              <Sparkles className="h-3.5 w-3.5" aria-hidden />
              AI · Automation · Software · Infrastructure
            </p>
            <h1 className="mt-6 bg-gradient-to-br from-white via-white to-slate-400 bg-clip-text font-heading text-4xl font-semibold tracking-tight text-transparent sm:text-5xl md:text-6xl lg:text-7xl">
              We Build Intelligent Systems That Grow Your Business
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-slate-400 md:text-xl">
              Premium delivery from Johannesburg & Soweto — AI-powered workflows, custom software, and infrastructure that
              earns its place on your P&amp;L.
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <Link href="/contact" className={cn(buttonVariants({ size: "lg" }), "gap-2 bg-gradient-to-r from-cyan-500 to-violet-600 text-white hover:opacity-95")}>
                Get a quote <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
              <a
                href={wa}
                target="_blank"
                rel="noreferrer"
                className={cn(buttonVariants({ variant: "outline", size: "lg" }), "border-cyan-500/40 text-cyan-200 hover:bg-cyan-500/10")}
              >
                WhatsApp us
              </a>
              <Link href="/demo" className={cn(buttonVariants({ variant: "ghost", size: "lg" }), "text-slate-300")}>
                See AI demo
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Services overview */}
      <section className="border-b border-white/5 py-16 md:py-24">
        <div className="mx-auto max-w-6xl px-4 md:px-6">
          <Reveal>
            <h2 className="font-heading text-2xl font-semibold text-white md:text-3xl">Capabilities</h2>
            <p className="mt-2 max-w-2xl text-slate-400">Everything we ship pushes revenue, reliability, or velocity — usually all three.</p>
          </Reveal>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {OVERVIEW.map(({ title, desc, icon: Icon }) => (
              <Reveal key={title}>
                <motion.div
                  whileHover={{ y: -4 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  className="group h-full rounded-2xl border border-white/[0.07] bg-gradient-to-b from-white/[0.06] to-transparent p-6 shadow-[0_0_40px_-12px_rgba(34,211,238,0.25)]"
                >
                  <Icon className="h-9 w-9 text-cyan-400 transition-colors group-hover:text-violet-400" aria-hidden />
                  <h3 className="mt-4 font-heading text-lg font-semibold text-white">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-400">{desc}</p>
                </motion.div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Differentiators */}
      <section className="border-b border-white/5 py-16 md:py-24">
        <div className="mx-auto max-w-6xl px-4 md:px-6">
          <Reveal className="grid gap-10 lg:grid-cols-2 lg:items-center">
            <div>
              <h2 className="font-heading text-2xl font-semibold text-white md:text-3xl">What makes us different</h2>
              <ul className="mt-8 space-y-5 text-slate-300">
                <li className="flex gap-3">
                  <BarChart3 className="mt-0.5 h-5 w-5 shrink-0 text-violet-400" aria-hidden />
                  <span>
                    <strong className="text-white">Revenue-aware systems</strong> — we trace outcomes to pipeline, cash
                    collection, and delivery milestones — not vanity metrics.
                  </span>
                </li>
                <li className="flex gap-3">
                  <Bot className="mt-0.5 h-5 w-5 shrink-0 text-cyan-400" aria-hidden />
                  <span>
                    <strong className="text-white">AI that ships</strong> — grounded workflows, evaluation, and guardrails
                    so models stay aligned with your business.
                  </span>
                </li>
                <li className="flex gap-3">
                  <MessageSquare className="mt-0.5 h-5 w-5 shrink-0 text-violet-400" aria-hidden />
                  <span>
                    <strong className="text-white">Real-time insight</strong> — dashboards and alerts your team actually
                    opens, fed by the same CRM our operators use.
                  </span>
                </li>
              </ul>
            </div>
            <div className="rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-950/40 to-cyan-950/30 p-8 md:p-10">
              <p className="text-sm font-medium uppercase tracking-widest text-cyan-300/90">Operator-grade</p>
              <p className="mt-3 text-lg font-medium text-white">One backbone from first lead to project delivery.</p>
              <p className="mt-3 text-sm leading-relaxed text-slate-400">
                Your website enquiry becomes a CRM record. Proposals use secure links. Acceptance triggers kickoff — no
                Black Hole email threads.
              </p>
              <Link href="/services" className={cn(buttonVariants({ variant: "secondary", className: "mt-8" }), "w-full sm:w-auto")}>
                Explore services
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Demo / showcase */}
      <section className="border-b border-white/5 py-16 md:py-24">
        <div className="mx-auto max-w-6xl px-4 md:px-6">
          <Reveal className="text-center">
            <h2 className="font-heading text-2xl font-semibold text-white md:text-3xl">See the stack in action</h2>
            <p className="mx-auto mt-2 max-w-2xl text-slate-400">
              Live AI demo, dashboard previews, and how clients review proposals — all wired to the same platform we run
              internally.
            </p>
          </Reveal>
          <div className="mt-12 grid gap-6 lg:grid-cols-2">
            <Reveal>
              <div className="flex h-full flex-col rounded-2xl border border-cyan-500/20 bg-[#0c1222] p-6">
                <div className="flex items-center gap-2 text-sm font-medium text-cyan-300">
                  <Bot className="h-4 w-4" aria-hidden />
                  AI assistant (preview)
                </div>
                <p className="mt-3 text-sm text-slate-400">Try the guided demo with canned responses — no keys required.</p>
                <div className="mt-6 flex flex-1 flex-col justify-end">
                  <Link href="/demo" className={cn(buttonVariants(), "w-full bg-cyan-600 text-white hover:bg-cyan-500")}>
                    Open AI demo
                  </Link>
                </div>
              </div>
            </Reveal>
            <Reveal>
              <div className="rounded-2xl border border-white/10 bg-[#0c1222] p-6">
                <div className="flex items-center gap-2 text-sm font-medium text-violet-300">
                  <Camera className="h-4 w-4" aria-hidden />
                  Dashboard preview
                </div>
                <div className="mt-6 grid grid-cols-3 gap-3">
                  {["Pipeline", "AI brief", "Activity"].map((label) => (
                    <div key={label} className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-8 text-center text-xs text-slate-500">
                      {label}
                    </div>
                  ))}
                </div>
                <p className="mt-4 text-xs text-slate-500">Representative layout — full operator UI available after onboarding.</p>
                <Link
                  href="/dashboard"
                  className={cn(
                    buttonVariants({ variant: "outline" }),
                    "mt-6 w-full border border-white/15 bg-transparent text-white hover:bg-white/5"
                  )}
                >
                  Team dashboard login
                </Link>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="border-b border-white/5 py-16 md:py-24">
        <div className="mx-auto max-w-6xl px-4 md:px-6">
          <Reveal>
            <h2 className="font-heading text-2xl font-semibold text-white md:text-3xl">What clients say</h2>
          </Reveal>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {testimonials.map((t, i) => (
              <Reveal key={i}>
                <blockquote className="h-full rounded-2xl border border-white/[0.07] bg-white/[0.03] p-6">
                  <p className="text-sm leading-relaxed text-slate-300">&ldquo;{t.quote}&rdquo;</p>
                  <footer className="mt-4 text-xs text-slate-500">
                    <span className="font-medium text-slate-400">{t.author}</span> · {t.company}
                  </footer>
                </blockquote>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 md:py-24">
        <Reveal className="mx-auto max-w-4xl px-4 text-center md:px-6">
          <h2 className="font-heading text-3xl font-semibold text-white md:text-4xl">Ready to upgrade how your business runs?</h2>
          <p className="mx-auto mt-4 max-w-xl text-slate-400">
            Tell us what you&apos;re building — we&apos;ll respond from the same CRM our delivery team uses daily.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <Link href="/contact" className={cn(buttonVariants({ size: "lg" }), "gap-2 bg-gradient-to-r from-cyan-500 to-violet-600 text-white")}>
              Book a discovery call
            </Link>
            <a href={wa} target="_blank" rel="noreferrer" className={cn(buttonVariants({ variant: "outline", size: "lg" }), "border-violet-500/40")}>
              WhatsApp
            </a>
          </div>
        </Reveal>
      </section>
    </>
  );
}
