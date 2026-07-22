/** Client-safe brand constants (no Node APIs). */

/** Public URL path for browser / email use (served from /public). */
export const BRAND_LOGO_PATH = "/brand/pjozz-logo.png";

export const BRAND_NAME = "Pjozz Technologies";
export const BRAND_TAGLINE = "Smart systems · Real results";

/** Absolute logo URL for transactional emails (needs public origin). */
export function brandLogoAbsoluteUrl(origin: string): string {
  const base = origin.replace(/\/$/, "");
  return `${base}${BRAND_LOGO_PATH}`;
}
