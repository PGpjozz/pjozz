import fs from "fs";
import path from "path";

/** Public URL path for browser / email use (served from /public). */
export const BRAND_LOGO_PATH = "/brand/pjozz-logo.png";

export const BRAND_NAME = "Pjozz Technologies";
export const BRAND_TAGLINE = "Smart systems · Real results";

let cachedDataUri: string | null = null;

/** Absolute filesystem path to the logo PNG (for PDF rendering). */
export function brandLogoFilePath(): string {
  return path.join(process.cwd(), "public", "brand", "pjozz-logo.png");
}

/**
 * Data URI for @react-pdf Image — avoids relying on fetch/file URL quirks in Node.
 */
export function brandLogoDataUri(): string {
  if (cachedDataUri) return cachedDataUri;
  const file = brandLogoFilePath();
  const buf = fs.readFileSync(file);
  cachedDataUri = `data:image/png;base64,${buf.toString("base64")}`;
  return cachedDataUri;
}

/** Absolute logo URL for transactional emails (needs public origin). */
export function brandLogoAbsoluteUrl(origin: string): string {
  const base = origin.replace(/\/$/, "");
  return `${base}${BRAND_LOGO_PATH}`;
}
