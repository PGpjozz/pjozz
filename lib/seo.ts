import type { Metadata } from "next";

import { SITE, absoluteUrl, getSiteUrl, siteTwitterHandle } from "@/lib/site-config";

type BuildMetadataInput = {
  /** Page title (short form; the layout adds the " | Pjozz Technologies" suffix). */
  title: string;
  /** ≤ 160 chars ideally. */
  description: string;
  /** Path this page is served on, e.g. "/about". Used for canonical + og:url. */
  path: string;
  /** Additional keywords beyond the site defaults. */
  keywords?: readonly string[];
  /** Override the default OG image (absolute URL or a same-origin path). */
  image?: string;
  /** OG type — defaults to "website". */
  ogType?: "website" | "article" | "profile";
  /** Set to true for pages that should be hidden from search engines. */
  noindex?: boolean;
};

/**
 * Build a Next.js `Metadata` object with consistent OG, Twitter, canonical,
 * and robots directives for a marketing page. Root `metadataBase` is set in
 * `app/layout.tsx`, so relative `image` paths resolve correctly.
 */
export function buildMetadata({
  title,
  description,
  path,
  keywords,
  image,
  ogType = "website",
  noindex = false,
}: BuildMetadataInput): Metadata {
  const url = absoluteUrl(path);
  const ogImage = image ?? defaultOgImage(title);
  const twitter = siteTwitterHandle();

  return {
    title,
    description,
    keywords: keywords ? [...SITE.keywords, ...keywords] : [...SITE.keywords],
    alternates: {
      canonical: url,
    },
    robots: noindex
      ? { index: false, follow: false, nocache: true }
      : {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            "max-image-preview": "large",
            "max-snippet": -1,
            "max-video-preview": -1,
          },
        },
    openGraph: {
      title,
      description,
      url,
      siteName: SITE.name,
      locale: SITE.locale,
      type: ogType,
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: `${title} — ${SITE.name}`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
      ...(twitter ? { site: twitter, creator: twitter } : {}),
    },
  };
}

/** Default dynamic OG image URL for a given page title. */
export function defaultOgImage(title: string): string {
  const params = new URLSearchParams({ title });
  return `${getSiteUrl()}/api/og?${params.toString()}`;
}
