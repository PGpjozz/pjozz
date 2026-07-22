import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Reveal } from "@/components/marketing/Reveal";
import { caseStudies } from "@/lib/marketing/content";
import { buttonVariants } from "@/components/ui/button";
import { buildMetadata } from "@/lib/seo";
import { cn } from "@/lib/utils";

export const metadata = buildMetadata({
  title: "Projects — selected case studies",
  description:
    "Representative engagements across student progression, AI knowledge systems, and automation backbones — anonymised where required, with references available during procurement.",
  path: "/projects",
});

export default function ProjectsPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-16 md:px-6 md:py-24">
      <Reveal className="max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-cyan-400">Case studies</p>
        <h1 className="mt-4 font-heading text-4xl font-semibold text-white md:text-5xl">Selected projects</h1>
        <p className="mt-4 text-lg text-slate-400">
          Representative engagements — anonymised where required. Full references available during procurement.
        </p>
      </Reveal>

      <div className="mt-16 space-y-12">
        {caseStudies.map((p) => (
          <Reveal key={p.slug}>
            <article className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0c1222]">
              <div className="border-b border-white/10 bg-gradient-to-r from-cyan-950/50 to-violet-950/50 px-6 py-5 md:px-10">
                <h2 className="font-heading text-2xl font-semibold text-white">{p.title}</h2>
              </div>
              <div className="grid gap-8 p-6 md:grid-cols-2 md:p-10">
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Problem</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-400">{p.problem}</p>
                  <h3 className="mt-6 text-xs font-semibold uppercase tracking-wider text-slate-500">Solution</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-300">{p.solution}</p>
                </div>
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Technologies</h3>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {p.technologies.map((t) => (
                      <span key={t} className="rounded-md border border-cyan-500/25 bg-cyan-500/10 px-2 py-1 font-mono text-xs text-cyan-200">
                        {t}
                      </span>
                    ))}
                  </div>
                  <h3 className="mt-8 text-xs font-semibold uppercase tracking-wider text-slate-500">Results</h3>
                  <ul className="mt-3 space-y-2 text-sm text-slate-400">
                    {p.results.map((r) => (
                      <li key={r}>→ {r}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </article>
          </Reveal>
        ))}
      </div>

      <Reveal className="mt-16 flex justify-center">
        <Link href="/contact" className={cn(buttonVariants({ size: "lg" }), "gap-2 bg-gradient-to-r from-cyan-500 to-violet-600 text-white")}>
          Start a similar engagement <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </Reveal>
    </div>
  );
}
