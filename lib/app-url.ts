/**
 * Public origin for tracking links, proposal share URLs, and webhooks.
 * Prefers NEXT_PUBLIC_APP_URL, then Vercel, then localhost for local dev.
 */
export function getAppOrigin(opts?: { required?: boolean }): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");

  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel.replace(/\/$/, "")}`;

  if (opts?.required && process.env.NODE_ENV === "production") {
    throw new Error("NEXT_PUBLIC_APP_URL or VERCEL_URL is required for email tracking links");
  }

  return "http://localhost:3000";
}
