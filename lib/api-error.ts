/** Map low-level failures to operator-facing API error strings. */
export function publicApiError(error: unknown, fallback = "Server error"): string {
  if (!(error instanceof Error)) return fallback;
  const msg = error.message;
  if (
    msg === "fetch failed" ||
    msg.includes("TypeError: fetch failed") ||
    msg.includes("ENOTFOUND") ||
    msg.includes("getaddrinfo") ||
    msg.includes("ECONNREFUSED") ||
    msg.includes("network")
  ) {
    return "Cannot reach Supabase (network/DNS). Check NEXT_PUBLIC_SUPABASE_URL and that the project is online.";
  }
  return msg || fallback;
}
