import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Reveal } from "@/components/marketing/Reveal";
import { industrySolutions } from "@/lib/marketing/content";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function SolutionsPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-16 md:px-6 md:py-24">
      <Reveal className="max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-violet-400">Solutions</p>
        <h1 className="mt-4 font-heading text-4xl font-semibold text-white md:text-5xl">Industry playbooks</h1>
        <p className="mt-4 text-lg text-slate-400">
          We translate vertical pain into systems — not slides. Each playbook ties problems to measurable outcomes.
        </p>
      </Reveal>

      <div className="mt-16 space-y-12">
        {industrySolutions.map((sol) => (
          <Reveal key={sol.slug}>
            <article className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6 md:p-10">
              <h2 className="font-heading text-2xl font-semibold text-white">{sol.industry}</h2>
              <div className="mt-8 grid gap-8 md:grid-cols-3">
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-red-400/90">Problem</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-400">{sol.problem}</p>
                </div>
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-cyan-400/90">Solution</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-300">{sol.solution}</p>
                </div>
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-violet-400/90">Benefits</h3>
                  <ul className="mt-2 space-y-2 text-sm text-slate-400">
                    {sol.benefits.map((b) => (
                      <li key={b}>✓ {b}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </article>
          </Reveal>
        ))}
      </div>

      <Reveal className="mt-16 text-center">
        <Link href="/contact" className={cn(buttonVariants({ size: "lg" }), "gap-2 bg-gradient-to-r from-cyan-500 to-violet-600 text-white")}>
          Discuss your industry <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </Reveal>
    </div>
  );
}
