import { SITE, absoluteUrl, getSiteUrl, siteEmail, sitePhoneDisplay, whatsappE164 } from "@/lib/site-config";

/**
 * Injects Organization + WebSite JSON-LD into the page head. Renders server-side
 * as a `<script type="application/ld+json">` node so search engines see it in the
 * initial HTML.
 */
export function StructuredData() {
  const url = getSiteUrl();
  const wa = whatsappE164();
  const contactPoints = [
    {
      "@type": "ContactPoint",
      contactType: "sales",
      email: siteEmail(),
      telephone: sitePhoneDisplay(),
      areaServed: "ZA",
      availableLanguage: ["en", "af", "zu"],
    },
    ...(wa
      ? [
          {
            "@type": "ContactPoint" as const,
            contactType: "customer service",
            telephone: `+${wa}`,
            contactOption: "TollFree",
            areaServed: "ZA",
            availableLanguage: ["en"],
          },
        ]
      : []),
  ];

  const organization = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${url}/#organization`,
    name: SITE.legalName,
    alternateName: SITE.name,
    url,
    logo: absoluteUrl("/brand/pjozz-logo.png"),
    description: SITE.description,
    slogan: SITE.tagline,
    email: siteEmail(),
    telephone: sitePhoneDisplay(),
    foundingDate: `${SITE.founded}-01-01`,
    address: {
      "@type": "PostalAddress",
      addressLocality: SITE.city,
      addressRegion: "Gauteng",
      addressCountry: SITE.region,
    },
    areaServed: SITE.areaServed,
    contactPoint: contactPoints,
    sameAs: [] as string[],
  };

  const website = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${url}/#website`,
    url,
    name: SITE.name,
    description: SITE.description,
    inLanguage: SITE.language,
    publisher: { "@id": `${url}/#organization` },
  };

  const localBusiness = {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    "@id": `${url}/#business`,
    name: SITE.legalName,
    url,
    image: absoluteUrl("/brand/pjozz-logo.png"),
    priceRange: "R",
    telephone: sitePhoneDisplay(),
    email: siteEmail(),
    address: {
      "@type": "PostalAddress",
      addressLocality: SITE.city,
      addressRegion: "Gauteng",
      addressCountry: SITE.region,
    },
    areaServed: SITE.areaServed.map((a) => ({ "@type": "Place", name: a })),
    openingHours: SITE.hoursOfOperation,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organization) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(website) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusiness) }}
      />
    </>
  );
}
