import { Mail, MapPin, MessageCircle } from "lucide-react";

import { ContactForm } from "@/components/site/contact-form";
import { QuoteForm } from "@/components/site/quote-form";
import { COMPANY } from "@/lib/marketing/content";
import { emailMailto, phoneTel, whatsappHref } from "@/lib/marketing/links";

export default function ContactPage() {
  const wa = whatsappHref();

  return (
    <div className="mx-auto max-w-6xl px-4 py-16 md:px-6 md:py-24">
      <div className="mx-auto max-w-3xl text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-cyan-400">Contact</p>
        <h1 className="mt-4 font-heading text-4xl font-semibold text-white md:text-5xl">Let&apos;s build</h1>
        <p className="mt-4 text-lg text-slate-400">
          Reach the same CRM our delivery team uses — faster routing, fewer dropped threads.
        </p>
      </div>

      <div className="mt-14 grid gap-10 lg:grid-cols-5 lg:gap-12">
        <aside className="space-y-6 lg:col-span-2">
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6">
            <h2 className="font-heading text-sm font-semibold uppercase tracking-wider text-slate-500">Direct</h2>
            <ul className="mt-4 space-y-4 text-sm">
              <li>
                <a href={wa} target="_blank" rel="noreferrer" className="flex items-center gap-3 text-cyan-300 hover:text-cyan-200">
                  <MessageCircle className="h-5 w-5 shrink-0" aria-hidden />
                  WhatsApp (fastest)
                </a>
              </li>
              <li>
                <a href={emailMailto} className="flex items-center gap-3 text-slate-300 hover:text-white">
                  <Mail className="h-5 w-5 shrink-0 text-violet-400" aria-hidden />
                  {COMPANY.emailDisplay}
                </a>
              </li>
              <li>
                <a href={phoneTel} className="flex items-center gap-3 text-slate-300 hover:text-white">
                  <span className="flex h-5 w-5 items-center justify-center font-mono text-xs text-violet-400">📞</span>
                  {COMPANY.phoneDisplay}
                </a>
              </li>
              <li className="flex gap-3 text-slate-400">
                <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-cyan-500/80" aria-hidden />
                <span>
                  {COMPANY.locations.join(" · ")}
                </span>
              </li>
            </ul>
            <p className="mt-4 text-xs text-slate-500">
              Set <code className="rounded bg-white/10 px-1">NEXT_PUBLIC_WHATSAPP_E164</code> in{" "}
              <code className="rounded bg-white/10 px-1">.env.local</code> for your real WhatsApp routing (e.g. 27791234567).
            </p>
          </div>

          <div className="rounded-2xl border border-violet-500/20 bg-violet-950/20 p-6">
            <h2 className="font-heading text-lg font-semibold text-white">Formal quote</h2>
            <p className="mt-2 text-sm text-slate-400">Procurement-friendly capture — we attach budget & timeline context to your CRM lead.</p>
            <div className="mt-6">
              <QuoteForm />
            </div>
          </div>
        </aside>

        <div className="lg:col-span-3">
          <div className="rounded-2xl border border-cyan-500/20 bg-[#0c1222] p-6 md:p-8">
            <h2 className="font-heading text-xl font-semibold text-white">Discovery form</h2>
            <p className="mt-2 text-sm text-slate-400">
              Prefer email-style detail? Use this — it posts to <code className="rounded bg-white/10 px-1 font-mono text-xs text-cyan-300">/api/contact</code> (same CRM as the
              operator workspace).
            </p>
            <div className="mt-8">
              <ContactForm />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
