/**
 * Single source of truth for public site info — canonical URL, brand copy,
 * contact points, social handles, locale. Consumed by SEO metadata, JSON-LD,
 * OG cards, sitemap, and the marketing pages themselves.
 *
 * All values fall back to sensible defaults so the site works out of the box;
 * override via environment variables for production.
 */

/** Canonical public origin (no trailing slash). Prefer NEXT_PUBLIC_SITE_URL; falls back to NEXT_PUBLIC_APP_URL. */
export function getSiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return raw.replace(/\/+$/, "");
}

/** Absolute URL for a given path on the canonical site. */
export function absoluteUrl(pathname: string): string {
  const base = getSiteUrl();
  const p = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return `${base}${p}`;
}

/** E.164 WhatsApp number (digits only). Empty string when unset. */
export function whatsappE164(): string {
  return (process.env.NEXT_PUBLIC_WHATSAPP_E164 ?? "").replace(/\D/g, "");
}

/** Human-friendly WhatsApp label. */
export function whatsappDisplay(): string {
  const n = whatsappE164();
  if (!n) return "WhatsApp";
  return `+${n.replace(/^(\d{2})(\d+)/, "$1 $2")}`;
}

export const SITE = {
  name: "Pjozz Technologies",
  legalName: "Pjozz Technologies (Pty) Ltd",
  shortName: "Pjozz",
  tagline: "Smart systems · Real results",
  description:
    "Premium AI, automation, custom software, and smart infrastructure for African businesses. Johannesburg & Soweto. Smart systems, real results.",
  keywords: [
    "AI solutions",
    "business automation",
    "custom software development",
    "CCTV installation",
    "networking",
    "Johannesburg",
    "Soweto",
    "South Africa",
    "Next.js development",
    "Supabase",
    "CRM automation",
  ],
  locale: "en_ZA",
  language: "en-ZA",
  region: "ZA",
  city: "Johannesburg",
  areaServed: ["Johannesburg", "Soweto", "Gauteng", "South Africa"],
  founded: 2024,
  hoursOfOperation: "Mo-Fr 08:00-17:00",
  twitter: {
    handle: "", // Set NEXT_PUBLIC_TWITTER_HANDLE to enable (e.g. "@pjozz")
  },
  contact: {
    // Read via helpers so env changes are picked up at request time.
    emailFallback: "hello@pjozz.co.za",
    phoneFallback: "+27 (0) 00 000 0000",
  },
} as const;

/** Publicly displayed contact email. */
export function siteEmail(): string {
  const env = process.env.NEXT_PUBLIC_HELLO_EMAIL?.trim();
  return env && env.length ? env : SITE.contact.emailFallback;
}

/** Phone display (e.g. "+27 …"). */
export function sitePhoneDisplay(): string {
  const raw = process.env.NEXT_PUBLIC_PHONE_TEL?.replace(/^tel:/, "").trim();
  return raw && raw.length ? raw : SITE.contact.phoneFallback;
}

/** `tel:` href. */
export function sitePhoneHref(): string {
  const raw = process.env.NEXT_PUBLIC_PHONE_TEL?.trim();
  if (raw && raw.startsWith("tel:")) return raw;
  if (raw && raw.length) return `tel:${raw.replace(/[^\d+]/g, "")}`;
  return "tel:+27000000000";
}

/** Twitter/X handle including the leading `@`, or null if unset. */
export function siteTwitterHandle(): string | null {
  const h = process.env.NEXT_PUBLIC_TWITTER_HANDLE?.trim();
  if (!h) return null;
  return h.startsWith("@") ? h : `@${h}`;
}

/** Plausible domain (e.g. "pjozz.co.za"). Empty = analytics disabled. */
export function plausibleDomain(): string | null {
  const d = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN?.trim();
  return d && d.length ? d : null;
}
