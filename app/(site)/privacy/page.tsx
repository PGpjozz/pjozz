import Link from "next/link";

import { buildMetadata } from "@/lib/seo";
import { SITE, siteEmail } from "@/lib/site-config";

export const metadata = buildMetadata({
  title: "Privacy policy",
  description:
    "How Pjozz Technologies collects, uses, and protects your personal information under POPIA and international standards.",
  path: "/privacy",
});

const LAST_UPDATED = "22 July 2026";

export default function PrivacyPage() {
  const email = siteEmail();

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 md:px-6 md:py-24">
      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-cyan-400">Legal</p>
      <h1 className="mt-4 font-heading text-4xl font-semibold text-white md:text-5xl">Privacy policy</h1>
      <p className="mt-3 text-sm text-slate-500">Last updated: {LAST_UPDATED}</p>

      <div className="prose prose-invert mt-10 max-w-none text-slate-300">
        <p>
          {SITE.legalName} (&ldquo;<strong>Pjozz</strong>&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;) is committed to
          protecting your personal information in line with South Africa&apos;s{" "}
          <em>Protection of Personal Information Act, 2013 (POPIA)</em>. This notice explains what we collect, why, and
          your rights.
        </p>

        <h2 className="mt-10 font-heading text-xl font-semibold text-white">1. Who we are</h2>
        <p>
          The responsible party is {SITE.legalName}, operating from {SITE.city}, South Africa. For any privacy question,
          contact us at{" "}
          <a href={`mailto:${email}`} className="text-cyan-300 hover:text-cyan-200">
            {email}
          </a>
          .
        </p>

        <h2 className="mt-10 font-heading text-xl font-semibold text-white">2. Information we collect</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5">
          <li>
            <strong>Enquiry data</strong> — the company name, contact name, email, phone, and message you submit through
            our contact and quote forms.
          </li>
          <li>
            <strong>Proposal interactions</strong> — when you review a proposal shared with you via secure link, we
            record acceptance events and comments you submit.
          </li>
          <li>
            <strong>Technical data</strong> — server logs (IP address, user agent, request path) retained for security
            and abuse prevention.
          </li>
          <li>
            <strong>Analytics</strong> — where enabled, we use Plausible Analytics which is cookieless and does not
            collect personal identifiers.
          </li>
        </ul>

        <h2 className="mt-10 font-heading text-xl font-semibold text-white">3. Why we process it</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5">
          <li>To respond to your enquiry, prepare quotes and proposals, and deliver services you engage us for.</li>
          <li>To operate our CRM and delivery workflow — the same system our team uses internally.</li>
          <li>To secure our services, prevent fraud, and meet legal obligations.</li>
          <li>With your consent, to send occasional service updates. You can opt out at any time.</li>
        </ul>

        <h2 className="mt-10 font-heading text-xl font-semibold text-white">4. Legal basis</h2>
        <p>
          We rely on your <strong>consent</strong> when you submit our forms, on <strong>contract performance</strong>{" "}
          when we deliver services to you, and on our <strong>legitimate interests</strong> for security and product
          improvement (balanced against your rights).
        </p>

        <h2 className="mt-10 font-heading text-xl font-semibold text-white">5. Sharing & processors</h2>
        <p>
          We use trusted processors to run the service: Supabase (database & auth), Resend (transactional email), and
          Twilio (WhatsApp, where enabled). We do not sell your data. Sub-processors are bound by data-protection terms
          equivalent to POPIA.
        </p>

        <h2 className="mt-10 font-heading text-xl font-semibold text-white">6. International transfers</h2>
        <p>
          Some processors operate outside South Africa. Where cross-border transfer occurs, we ensure adequate
          safeguards (standard contractual clauses, adequacy decisions, or your explicit consent).
        </p>

        <h2 className="mt-10 font-heading text-xl font-semibold text-white">7. Retention</h2>
        <p>
          Enquiry data is retained for as long as needed to serve you and for legitimate business records (typically 3
          years from last interaction). Contractual and financial records are retained for 5 years to meet tax
          obligations.
        </p>

        <h2 className="mt-10 font-heading text-xl font-semibold text-white">8. Your rights</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5">
          <li>Access — request a copy of the personal information we hold about you.</li>
          <li>Correction — ask us to fix inaccurate data.</li>
          <li>Deletion — request erasure where we have no lawful reason to keep it.</li>
          <li>Objection & withdrawal of consent — where processing is based on consent or legitimate interest.</li>
          <li>Complaint — lodge a complaint with the Information Regulator (South Africa).</li>
        </ul>

        <h2 className="mt-10 font-heading text-xl font-semibold text-white">9. Security</h2>
        <p>
          Data is encrypted in transit (TLS) and at rest by our infrastructure providers. Access to production systems
          is restricted, audited, and requires multi-factor authentication.
        </p>

        <h2 className="mt-10 font-heading text-xl font-semibold text-white">10. Cookies</h2>
        <p>
          Our marketing site uses only strictly-necessary storage (e.g. remembering your admin session on the operator
          console). We do not use tracking cookies. Analytics, when enabled, is cookieless via Plausible.
        </p>

        <h2 className="mt-10 font-heading text-xl font-semibold text-white">11. Changes to this policy</h2>
        <p>We may update this notice as our services evolve. Material changes will be flagged on this page and dated.</p>

        <h2 className="mt-10 font-heading text-xl font-semibold text-white">Contact</h2>
        <p>
          Send data-protection questions to{" "}
          <a href={`mailto:${email}`} className="text-cyan-300 hover:text-cyan-200">
            {email}
          </a>
          .
        </p>

        <div className="mt-12 rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-sm text-slate-400">
          Read our{" "}
          <Link href="/terms" className="text-cyan-300 hover:text-cyan-200">
            Terms of service
          </Link>{" "}
          or{" "}
          <Link href="/contact" className="text-cyan-300 hover:text-cyan-200">
            contact the team
          </Link>{" "}
          for anything not covered above.
        </div>
      </div>
    </div>
  );
}
