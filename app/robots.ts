import type { MetadataRoute } from "next";

import { absoluteUrl, getSiteUrl } from "@/lib/site-config";

/** `robots.txt` — allow all crawlers on the marketing site, keep operator/API private. */
export default function robots(): MetadataRoute.Robots {
  const isProdHost = !/localhost|127\.0\.0\.1/.test(getSiteUrl());
  return {
    rules: isProdHost
      ? [
          {
            userAgent: "*",
            allow: ["/"],
            disallow: [
              "/api/",
              "/dashboard",
              "/leads",
              "/pipeline",
              "/outreach",
              "/proposals",
              "/clients",
              "/billing",
              "/settings",
              "/login",
              "/p/", // Public proposal links — not for indexing.
            ],
          },
        ]
      : [{ userAgent: "*", disallow: ["/"] }],
    sitemap: absoluteUrl("/sitemap.xml"),
    host: getSiteUrl(),
  };
}
