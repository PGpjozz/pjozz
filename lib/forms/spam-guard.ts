/**
 * Lightweight spam controls for public forms (honeypot + per-IP rate limit).
 * In-memory rate limits are best-effort on serverless (per-instance); still
 * blocks casual floods and bots that fill hidden fields.
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

const WINDOW_MS = 15 * 60 * 1000;
const MAX_PER_WINDOW = 8;

/** Extract a coarse client key from request headers. */
export function clientIpKey(req: Request): string {
  const xf = req.headers.get("x-forwarded-for");
  if (xf) return xf.split(",")[0]?.trim() || "unknown";
  const real = req.headers.get("x-real-ip");
  if (real) return real.trim();
  return "unknown";
}

/** Returns true when this IP should be blocked for the given form. */
export function isRateLimited(form: string, ip: string): boolean {
  const key = `${form}:${ip}`;
  const now = Date.now();
  const cur = buckets.get(key);
  if (!cur || cur.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  cur.count += 1;
  return cur.count > MAX_PER_WINDOW;
}

/**
 * Honeypot: bots fill a hidden "website" / "company_url" field.
 * Real humans leave it empty. Accept either naming for flexibility.
 */
export function isHoneypotTripped(body: Record<string, unknown>): boolean {
  const traps = ["website", "companyUrl", "company_url", "hp_field"];
  for (const k of traps) {
    const v = body[k];
    if (typeof v === "string" && v.trim().length > 0) return true;
  }
  return false;
}
