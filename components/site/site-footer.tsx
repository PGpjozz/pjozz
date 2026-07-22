import Link from "next/link";
import { Mail, MessageCircle } from "lucide-react";

import { BrandLogo } from "@/components/brand/brand-logo";
import { whatsappHref } from "@/lib/marketing/links";
import { SITE, siteEmail, sitePhoneDisplay, sitePhoneHref } from "@/lib/site-config";

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
      { href: "/contact", label: "Get support" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/privacy", label: "Privacy policy" },
      { href: "/terms", label: "Terms of service" },
    ],
  },
] as const;

export function SiteFooter() {
  const year = new Date().getFullYear();
  const wa = whatsappHref();
  const email = siteEmail();
  const phone = sitePhoneDisplay();
  const phoneHref = sitePhoneHref();

  return (
    <footer className="border-t border-white/10 bg-[#020617]/90">
      <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-12 md:flex-row md:justify-between md:px-6">
        <div>
          <BrandLogo href="/" size="md" showWordmark tone="dark" />
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-slate-400">
            Intelligent systems for growth — AI, automation, software, and infrastructure across South Africa.
          </p>
          <p className="mt-4 text-xs text-slate-500">{SITE.city} · Soweto · Serving nationwide</p>
          <address className="mt-5 space-y-2 text-sm text-slate-400 not-italic">
            <a
              href={wa}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 hover:text-cyan-300"
            >
              <MessageCircle className="h-4 w-4 text-cyan-400" aria-hidden />
              WhatsApp
            </a>
            <a href={`mailto:${email}`} className="flex items-center gap-2 hover:text-cyan-300">
              <Mail className="h-4 w-4 text-violet-400" aria-hidden />
              {email}
            </a>
            <a href={phoneHref} className="flex items-center gap-2 hover:text-cyan-300">
              <span aria-hidden className="inline-block h-4 w-4 text-center font-mono text-xs text-violet-400">
                ☏
              </span>
              {phone}
            </a>
          </address>
        </div>
        <div className="grid grid-cols-2 gap-10 sm:grid-cols-4">
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
      <div className="border-t border-white/5 py-5 text-center text-xs text-slate-500">
        <p>© {year} {SITE.legalName}. All rights reserved.</p>
        <p className="mt-1">
          <Link href="/privacy" className="hover:text-cyan-300">
            Privacy
          </Link>
          <span className="mx-2 opacity-40">·</span>
          <Link href="/terms" className="hover:text-cyan-300">
            Terms
          </Link>
          <span className="mx-2 opacity-40">·</span>
          <Link href="/contact" className="hover:text-cyan-300">
            Contact
          </Link>
        </p>
      </div>
    </footer>
  );
}
