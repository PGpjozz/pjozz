import { SiteAnalytics } from "@/components/site/site-analytics";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { StructuredData } from "@/components/site/structured-data";
import { WhatsAppFab } from "@/components/site/whatsapp-fab";
import { buildMetadata } from "@/lib/seo";
import { SITE } from "@/lib/site-config";

export const metadata = buildMetadata({
  title: `${SITE.name} — Intelligent Systems for Growth`,
  description: SITE.description,
  path: "/",
});

/** Customer-facing marketing shell — neon/dark aesthetic independent of operator UI tokens */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#030712] text-slate-100 antialiased">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-cyan-500 focus:px-4 focus:py-2 focus:font-medium focus:text-slate-950 focus:shadow-lg focus:outline-none"
      >
        Skip to content
      </a>
      <div aria-hidden className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(56,189,248,0.08),transparent)]" />
      <div aria-hidden className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_60%_40%_at_100%_10%,rgba(167,139,250,0.06),transparent)]" />
      <div className="relative flex min-h-screen flex-col">
        <SiteHeader />
        <main id="main-content" className="flex-1">
          {children}
        </main>
        <SiteFooter />
      </div>
      <WhatsAppFab />
      <StructuredData />
      <SiteAnalytics />
    </div>
  );
}
