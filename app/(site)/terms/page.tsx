import Link from "next/link";

import { buildMetadata } from "@/lib/seo";
import { SITE, siteEmail } from "@/lib/site-config";

export const metadata = buildMetadata({
  title: "Terms of service",
  description:
    "The terms under which Pjozz Technologies provides its website, quote forms, and client-facing services.",
  path: "/terms",
});

const LAST_UPDATED = "22 July 2026";

export default function TermsPage() {
  const email = siteEmail();

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 md:px-6 md:py-24">
      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-violet-400">Legal</p>
      <h1 className="mt-4 font-heading text-4xl font-semibold text-white md:text-5xl">Terms of service</h1>
      <p className="mt-3 text-sm text-slate-500">Last updated: {LAST_UPDATED}</p>

      <div className="prose prose-invert mt-10 max-w-none text-slate-300">
        <p>
          These terms govern your use of {SITE.legalName}&apos;s website, forms, and client-facing tools (together, the
          &ldquo;<strong>Service</strong>&rdquo;). By using the Service you agree to these terms. Consulting, delivery,
          and support engagements are covered by a separate written Statement of Work (SOW) or Master Services
          Agreement.
        </p>

        <h2 className="mt-10 font-heading text-xl font-semibold text-white">1. Website content</h2>
        <p>
          Content on this website is provided for informational purposes. We take reasonable care but do not warrant
          accuracy, completeness, or fitness for a specific purpose. You should not rely solely on website copy for
          contractual decisions — the SOW governs.
        </p>

        <h2 className="mt-10 font-heading text-xl font-semibold text-white">2. Enquiries & proposals</h2>
        <p>
          Submissions through our contact and quote forms create a lead in our CRM. Any proposal we send is valid for
          the period stated in the document. Acceptance via secure link on our proposal page constitutes an offer to
          engage on the scope shown, subject to written confirmation and applicable SOW.
        </p>

        <h2 className="mt-10 font-heading text-xl font-semibold text-white">3. Payment</h2>
        <p>
          Where a proposal is accepted, invoicing follows the schedule stated. Standard payment terms are 14 days from
          invoice date unless otherwise agreed. Late payments may attract interest at the prime rate + 2%.
        </p>

        <h2 className="mt-10 font-heading text-xl font-semibold text-white">4. Intellectual property</h2>
        <p>
          The Pjozz brand, marketing copy, product designs, and code powering this website are owned by {SITE.legalName}
          . Deliverables created under a signed SOW transfer or license to you as specified in that SOW.
        </p>

        <h2 className="mt-10 font-heading text-xl font-semibold text-white">5. Acceptable use</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5">
          <li>Do not submit false information or another person&apos;s data without authorisation.</li>
          <li>Do not attempt to breach security, probe the API, or scrape at rates that impact availability.</li>
          <li>Do not use the Service to send unlawful content or violate third-party rights.</li>
        </ul>

        <h2 className="mt-10 font-heading text-xl font-semibold text-white">6. Availability</h2>
        <p>
          We aim for high availability but the marketing website is provided &ldquo;as is&rdquo;. Paid engagements have
          SLA terms defined in the applicable SOW.
        </p>

        <h2 className="mt-10 font-heading text-xl font-semibold text-white">7. Liability</h2>
        <p>
          To the fullest extent permitted by law, {SITE.legalName} is not liable for indirect, incidental, or
          consequential damages arising from use of the Service. Our aggregate liability for the marketing website is
          limited to ZAR 1,000. Paid engagement liability is governed by the SOW.
        </p>

        <h2 className="mt-10 font-heading text-xl font-semibold text-white">8. Governing law</h2>
        <p>
          These terms are governed by the laws of the Republic of South Africa. Disputes will be resolved in the courts
          of Johannesburg unless the parties agree to arbitration.
        </p>

        <h2 className="mt-10 font-heading text-xl font-semibold text-white">9. Changes</h2>
        <p>
          We may update these terms as our services evolve. Material changes will be flagged on this page. Continued use
          of the Service after changes are posted constitutes acceptance of the revised terms.
        </p>

        <h2 className="mt-10 font-heading text-xl font-semibold text-white">Contact</h2>
        <p>
          Questions about these terms? Reach us at{" "}
          <a href={`mailto:${email}`} className="text-cyan-300 hover:text-cyan-200">
            {email}
          </a>
          .
        </p>

        <div className="mt-12 rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-sm text-slate-400">
          See also our{" "}
          <Link href="/privacy" className="text-cyan-300 hover:text-cyan-200">
            Privacy policy
          </Link>
          .
        </div>
      </div>
    </div>
  );
}
