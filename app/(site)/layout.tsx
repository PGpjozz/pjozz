import type { Metadata } from "next";

import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";

export const metadata: Metadata = {
  title: "Pjozz Technologies — Intelligent Systems for Growth",
  description:
    "Premium AI, automation, software, and infrastructure for African businesses. Johannesburg & Soweto. Smart systems. Real results.",
  openGraph: {
    title: "Pjozz Technologies",
    description: "AI · Automation · Custom software · Smart infrastructure — built to convert and deliver.",
  },
};

/** Customer-facing marketing shell — neon/dark aesthetic independent of operator UI tokens */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#030712] text-slate-100 antialiased">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(56,189,248,0.08),transparent)]" />
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_60%_40%_at_100%_10%,rgba(167,139,250,0.06),transparent)]" />
      <div className="relative flex min-h-screen flex-col">
        <SiteHeader />
        <div className="flex-1">{children}</div>
        <SiteFooter />
      </div>
    </div>
  );
}
