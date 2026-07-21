import Link from "next/link";

import { BrandLogo } from "@/components/brand/brand-logo";

const COL = [
  {
    title: "Company",
    links: [
      { href: "/about", label: "About" },
      { href: "/projects", label: "Projects" },
      { href: "/contact", label: "Contact" },
    ],
  },
  {
    title: "Services",
    links: [
      { href: "/services", label: "All services" },
      { href: "/solutions", label: "Industries" },
      { href: "/demo", label: "AI demo" },
    ],
  },
  {
    title: "Clients",
    links: [
      { href: "/portal", label: "Client portal" },
      { href: "/client", label: "Proposal link" },
      { href: "/dashboard", label: "Team dashboard" },
    ],
  },
] as const;

export function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-white/10 bg-[#020617]/90">
      <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-12 md:flex-row md:justify-between md:px-6">
        <div>
          <BrandLogo href="/" size="md" showWordmark tone="dark" />
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-slate-400">
            Intelligent systems for growth — AI, automation, software, and infrastructure across South Africa.
          </p>
          <p className="mt-4 text-xs text-slate-500">Johannesburg · Soweto · Serving nationwide</p>
        </div>
        <div className="grid grid-cols-2 gap-10 sm:grid-cols-3">
          {COL.map((c) => (
            <div key={c.title}>
              <p className="text-xs font-semibold uppercase tracking-wider text-cyan-400/90">{c.title}</p>
              <ul className="mt-3 space-y-2 text-sm text-slate-400">
                {c.links.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="hover:text-cyan-300">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
      <div className="border-t border-white/5 py-4 text-center text-xs text-slate-500">
        © {year} Pjozz Technologies. Enterprise-grade delivery — same CRM from first click to handover.
      </div>
    </footer>
  );
}
