import { HomeView } from "@/components/marketing/HomeView";
import { buildMetadata } from "@/lib/seo";
import { SITE } from "@/lib/site-config";

export const metadata = buildMetadata({
  title: `${SITE.name} — Intelligent Systems for Growth`,
  description: SITE.description,
  path: "/",
  keywords: ["AI development", "custom software South Africa", "business automation Johannesburg"],
});

export default function MarketingHomePage() {
  return <HomeView />;
}
