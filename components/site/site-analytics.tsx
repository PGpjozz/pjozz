import Script from "next/script";

import { plausibleDomain } from "@/lib/site-config";

/**
 * Privacy-friendly analytics via Plausible (cookieless, no consent banner needed).
 * Renders nothing unless `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` is set.
 */
export function SiteAnalytics() {
  const domain = plausibleDomain();
  if (!domain) return null;

  return (
    <Script
      id="plausible-analytics"
      strategy="afterInteractive"
      src="https://plausible.io/js/script.js"
      data-domain={domain}
      defer
    />
  );
}
