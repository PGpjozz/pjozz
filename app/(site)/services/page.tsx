import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Reveal } from "@/components/marketing/Reveal";
import { marketingServices } from "@/lib/marketing/content";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function ServicesPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-16 md:px-6 md:py-24">
      <Reveal className="max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-cyan-400">Services</p>
        <h1 className="mt-4 font-heading text-4xl font-semibold text-white md:text-5xl">Technical capabilities</h1>
        <p className="mt-4 text-lg text-slate-400">
          Deep engagements across AI, automation, product engineering, and physical infrastructure — scoped as milestones
          so you can fund delivery in phases.
        </p>
      </Reveal>

      <div className="mt-16 space-y-24">
        {marketingServices.map((s, idx) => (
          <Reveal key={s.slug} id={s.slug}>
            <article className="grid gap-10 border-t border-white/10 pt-16 first:border-t-0 first:pt-0 lg:grid-cols-2 lg:gap-14">
              <div>
                <span className="text-sm font-mono text-violet-400">0{idx + 1}</span>
                <h2 className="mt-2 font-heading text-2xl font-semibold text-white md:text-3xl">{s.title}</h2>
                <p className="mt-1 text-cyan-200/80">{s.tagline}</p>
                <p className="mt-4 leading-relaxed text-slate-400">{s.description}</p>
                <div className="mt-8">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500">Features</h3>
                  <ul className="mt-3 space-y-2 text-sm text-slate-300">
                    {s.features.map((f) => (
                      <li key={f} className="flex gap-2">
                        <span className="text-cyan-500">▹</span>
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="mt-8">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500">Example use cases</h3>
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {s.useCases.map((u) => (
                      <span key={u} className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-slate-300">
                        {u}
                      </span>
                    ))}
                  </ul>
                </div>
              </div>
              <div>
                {s.tiers ? (
                  <div className="space-y-4">
                    {s.tiers.map((t) => (
                      <div
                        key={t.name}
                        className="rounded-2xl border border-white/[0.08] bg-gradient-to-b from-white/[0.05] to-transparent p-6"
                      >
                        <div className="flex items-baseline justify-between gap-4">
                          <h3 className="font-heading text-lg font-semibold text-white">{t.name}</h3>
                          <span className="text-sm text-cyan-300/90">{t.priceLabel}</span>
                        </div>
                        <ul className="mt-4 space-y-2 text-sm text-slate-400">
                          {t.bullets.map((b) => (
                            <li key={b}>· {b}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-violet-500/20 bg-violet-950/20 p-8">
                    <p className="text-sm text-slate-300">
                      Pricing is scoped per environment — network/CCTV projects depend on site survey, cable paths, and
                      retention requirements.
                    </p>
                    <Link href="/contact" className={cn(buttonVariants({ className: "mt-6" }), "bg-cyan-600 text-white hover:bg-cyan-500")}>
                      Discuss scope
                    </Link>
                  </div>
                )}
              </div>
            </article>
          </Reveal>
        ))}
      </div>

      <Reveal className="mt-24 rounded-2xl border border-cyan-500/25 bg-gradient-to-r from-cyan-950/40 to-violet-950/40 p-8 text-center md:p-12">
        <h2 className="font-heading text-2xl font-semibold text-white">Need a proposal breakdown?</h2>
        <p className="mx-auto mt-2 max-w-lg text-slate-400">
          We&apos;ll respond from our CRM with a structured quote path — no ghosting, no mystery phases.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/contact" className={cn(buttonVariants({ size: "lg" }), "gap-2 bg-gradient-to-r from-cyan-500 to-violet-600 text-white")}>
            Get a quote <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
          <Link
            href="/solutions"
            className={cn(buttonVariants({ variant: "outline", size: "lg" }), "border-white/20 text-white")}
          >
            Industry solutions
          </Link>
        </div>
      </Reveal>
    </div>
  );
}
