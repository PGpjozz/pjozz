import { Mail, MapPin, MessageCircle, Phone } from "lucide-react";

import { ContactForm } from "@/components/site/contact-form";
import { QuoteForm } from "@/components/site/quote-form";
import { COMPANY } from "@/lib/marketing/content";
import { whatsappHref } from "@/lib/marketing/links";
import { buildMetadata } from "@/lib/seo";
import { siteEmail, sitePhoneDisplay, sitePhoneHref } from "@/lib/site-config";

export const metadata = buildMetadata({
  title: "Contact — let's build",
  description:
    "Reach the Pjozz Technologies team via WhatsApp, email, or our discovery form. Enquiries route straight into the same CRM our delivery team uses.",
  path: "/contact",
});

export default function ContactPage() {
  const wa = whatsappHref();
  const email = siteEmail();
  const phone = sitePhoneDisplay();
  const phoneHref = sitePhoneHref();

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
                <a
                  href={wa}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-3 text-cyan-300 hover:text-cyan-200"
                >
                  <MessageCircle className="h-5 w-5 shrink-0" aria-hidden />
                  WhatsApp (fastest)
                </a>
              </li>
              <li>
                <a href={`mailto:${email}`} className="flex items-center gap-3 text-slate-300 hover:text-white">
                  <Mail className="h-5 w-5 shrink-0 text-violet-400" aria-hidden />
                  {email}
                </a>
              </li>
              <li>
                <a href={phoneHref} className="flex items-center gap-3 text-slate-300 hover:text-white">
                  <Phone className="h-5 w-5 shrink-0 text-violet-400" aria-hidden />
                  {phone}
                </a>
              </li>
              <li className="flex gap-3 text-slate-400">
                <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-cyan-500/80" aria-hidden />
                <span>{COMPANY.locations.join(" · ")}</span>
              </li>
            </ul>
            <p className="mt-4 text-xs text-slate-500">
              Business hours: Mon–Fri, 08:00–17:00 SAST. We aim to reply within one business day.
            </p>
          </div>

          <div className="rounded-2xl border border-violet-500/20 bg-violet-950/20 p-6">
            <h2 className="font-heading text-lg font-semibold text-white">Formal quote</h2>
            <p className="mt-2 text-sm text-slate-400">
              Procurement-friendly capture — we attach budget &amp; timeline context to your CRM lead.
            </p>
            <div className="mt-6">
              <QuoteForm />
            </div>
          </div>
        </aside>

        <div className="lg:col-span-3">
          <div className="rounded-2xl border border-cyan-500/20 bg-[#0c1222] p-6 md:p-8">
            <h2 className="font-heading text-xl font-semibold text-white">Discovery form</h2>
            <p className="mt-2 text-sm text-slate-400">
              Prefer more detail? Tell us what you&apos;re building — services, constraints, and outcomes.
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
