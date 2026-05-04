import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Reveal } from "@/components/marketing/Reveal";
import { COMPANY, skillsBadges } from "@/lib/marketing/content";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-16 md:px-6 md:py-24">
      <Reveal className="max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-violet-400">About</p>
        <h1 className="mt-4 font-heading text-4xl font-semibold text-white md:text-5xl">Built for operators</h1>
        <p className="mt-6 text-lg leading-relaxed text-slate-400">
          Pjozz Technologies started from a simple frustration: too many “digital transformations” stop at slides.
          We build systems that show up in revenue, uptime, and peace of mind — especially for teams operating across
          Johannesburg, Soweto, and beyond.
        </p>
      </Reveal>

      <div className="mt-16 grid gap-10 lg:grid-cols-2">
        <Reveal>
          <div className="rounded-2xl border border-cyan-500/20 bg-cyan-950/20 p-8">
            <h2 className="font-heading text-xl font-semibold text-white">Mission</h2>
            <p className="mt-3 text-slate-300">{COMPANY.mission}</p>
          </div>
        </Reveal>
        <Reveal>
          <div className="rounded-2xl border border-violet-500/20 bg-violet-950/20 p-8">
            <h2 className="font-heading text-xl font-semibold text-white">Vision</h2>
            <p className="mt-3 text-slate-300">{COMPANY.vision}</p>
          </div>
        </Reveal>
      </div>

      <Reveal className="mt-16">
        <h2 className="font-heading text-2xl font-semibold text-white">Capabilities & stack</h2>
        <div className="mt-6 flex flex-wrap gap-2">
          {skillsBadges.map((s) => (
            <span key={s} className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-slate-300">
              {s}
            </span>
          ))}
        </div>
      </Reveal>

      <Reveal className="mt-16 text-center">
        <Link href="/contact" className={cn(buttonVariants({ size: "lg" }), "gap-2 bg-gradient-to-r from-cyan-500 to-violet-600 text-white")}>
          Work with us <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </Reveal>
    </div>
  );
}
