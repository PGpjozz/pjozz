import fs from "fs";
import path from "path";

/** Absolute filesystem path to the logo PNG (for PDF rendering). */
export function brandLogoFilePath(): string {
  return path.join(process.cwd(), "public", "brand", "pjozz-logo.png");
}

let cachedDataUri: string | null = null;

/**
 * Data URI for @react-pdf Image — avoids relying on fetch/file URL quirks in Node.
 * Server-only: never import from client components.
 */
export function brandLogoDataUri(): string {
  if (cachedDataUri) return cachedDataUri;
  const file = brandLogoFilePath();
  const buf = fs.readFileSync(file);
  cachedDataUri = `data:image/png;base64,${buf.toString("base64")}`;
  return cachedDataUri;
}
