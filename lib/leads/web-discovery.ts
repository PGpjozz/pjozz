import { randomUUID } from "node:crypto";

/**
 * Internet lead discovery via Google Programmable Search JSON API.
 * Setup: https://programmablesearchengine.google.com/ → create engine → enable "Search the entire web"
 * Env: GOOGLE_CSE_API_KEY, GOOGLE_CSE_CX (search engine id).
 */

export type DiscoveredCandidate = {
  id: string;
  companyName: string;
  websiteUrl: string;
  snippet: string;
  displayHost: string;
  suggestedEmail: string | null;
};

export type WebsiteEmailDiscovery = {
  emails: string[];
  chosen: string | null;
  scannedUrls: string[];
};

type GoogleCseItem = {
  title?: string;
  link?: string;
  snippet?: string;
  displayLink?: string;
};

type GoogleCseResponse = {
  items?: GoogleCseItem[];
  queries?: {
    request?: Array<{ startIndex?: number; count?: number }>;
    nextPage?: Array<{ startIndex?: number }>;
  };
  searchInformation?: {
    totalResults?: string;
  };
};

export function isDiscoveryConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CSE_API_KEY?.trim() && process.env.GOOGLE_CSE_CX?.trim());
}

export function normalizeHostname(urlOrHost: string): string | null {
  try {
    const u = urlOrHost.startsWith("http") ? new URL(urlOrHost) : new URL(`https://${urlOrHost}`);
    const h = u.hostname.toLowerCase().replace(/^www\./, "");
    return h.includes(".") ? h : null;
  } catch {
    return null;
  }
}

export function guessContactEmail(websiteUrl: string): string | null {
  const host = normalizeHostname(websiteUrl);
  if (!host) return null;
  if (["google.com", "facebook.com", "instagram.com", "linkedin.com", "twitter.com", "x.com", "youtube.com"].some((b) => host === b || host.endsWith(`.${b}`))) {
    return null;
  }
  return `info@${host}`;
}

function uniq<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

function normalizeEmail(raw: string): string | null {
  const t = raw.trim().toLowerCase();
  if (!t.includes("@")) return null;
  // Strip common trailing punctuation
  const cleaned = t.replace(/[)\],.;:!?]+$/g, "");
  // Extremely small validation; main validation is Zod/email check later.
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleaned)) return null;
  return cleaned;
}

function extractEmailsFromText(text: string): string[] {
  // Basic email regex; good enough for discovery.
  const re = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
  const matches = text.match(re) ?? [];
  const direct = matches.map((m) => normalizeEmail(m)).filter(Boolean) as string[];

  // Common obfuscations: "name [at] domain [dot] com", "name(at)domain.com"
  const obfuscated = text
    .replace(/\s*\[\s*at\s*\]\s*/gi, "@")
    .replace(/\s*\(\s*at\s*\)\s*/gi, "@")
    .replace(/\s+at\s+/gi, "@")
    .replace(/\s*\[\s*dot\s*\]\s*/gi, ".")
    .replace(/\s*\(\s*dot\s*\)\s*/gi, ".")
    .replace(/\s+dot\s+/gi, ".")
    .match(re)
    ?.map((m) => normalizeEmail(m))
    .filter(Boolean) as string[] | undefined;

  return uniq([...(direct ?? []), ...(obfuscated ?? [])]);
}

function chooseBestEmail(candidates: string[], host: string | null): string | null {
  if (!candidates.length) return null;
  const lower = candidates.map((e) => e.toLowerCase());
  const blockedPrefixes = ["noreply@", "no-reply@", "donotreply@", "info@"];
  const score = (email: string): number => {
    const e = email.toLowerCase();
    let s = 0;
    if (host && e.endsWith(`@${host}`)) s += 20;
    if (e.includes("sales@") || e.includes("hello@") || e.includes("support@") || e.includes("contact@")) s += 10;
    if (blockedPrefixes.some((p) => e.startsWith(p))) s -= 5;
    return s;
  };
  const sorted = [...lower].sort((a, b) => score(b) - score(a));
  return sorted[0] ?? null;
}

async function safeFetchText(url: string, timeoutMs = 7000): Promise<string | null> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      cache: "no-store",
      signal: ctrl.signal,
      headers: {
        "user-agent": process.env.DISCOVERY_USER_AGENT?.trim() || "Mozilla/5.0 (PjozzLeadDiscovery/1.0)",
        accept: "text/html,application/xhtml+xml",
      },
    });
    if (!res.ok) return null;
    const ct = res.headers.get("content-type") ?? "";
    if (!ct.includes("text/html")) return null;
    const txt = await res.text();
    return txt;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

function resolveCandidateUrls(baseUrl: string): string[] {
  try {
    const u = new URL(baseUrl);
    const origin = u.origin;
    return uniq([
      origin,
      `${origin}/contact`,
      `${origin}/contact-us`,
      `${origin}/about`,
      `${origin}/about-us`,
      `${origin}/impressum`,
    ]);
  } catch {
    return [];
  }
}

/**
 * Attempt to discover real contact emails by scanning a small set of pages:
 * homepage + contact/about pages. This is intentionally lightweight.
 */
export async function discoverEmailsFromWebsite(websiteUrl: string): Promise<WebsiteEmailDiscovery> {
  const scannedUrls = resolveCandidateUrls(websiteUrl);
  const host = normalizeHostname(websiteUrl);
  const emails: string[] = [];
  for (const url of scannedUrls) {
    const html = await safeFetchText(url);
    if (!html) continue;
    for (const e of extractEmailsFromText(html)) emails.push(e);
  }
  const unique = uniq(emails);
  const chosen = chooseBestEmail(unique, host);
  return { emails: unique, chosen, scannedUrls };
}

function companyNameFromResult(title: string, displayLink: string): string {
  const t = title.trim();
  const cut = t.split(/\s*[\|–—-]\s*/)[0]?.trim() ?? t;
  if (cut.length > 120) return cut.slice(0, 117) + "...";
  return cut || displayLink.split(".")[0] || "Unknown";
}

const SKIP_HOST_SUBSTR = ["facebook.com", "linkedin.com", "instagram.com", "twitter.com", "google.com/search", "youtube.com"];

function shouldSkipUrl(link: string): boolean {
  const low = link.toLowerCase();
  return SKIP_HOST_SUBSTR.some((s) => low.includes(s));
}

/** Fetch Google Custom Search results (up to 10 per call). */
export async function searchGoogleForLeads(query: string, maxResults = 10): Promise<DiscoveredCandidate[]> {
  const key = process.env.GOOGLE_CSE_API_KEY?.trim();
  const cx = process.env.GOOGLE_CSE_CX?.trim();
  if (!key || !cx) {
    throw new Error("Web discovery is not configured. Set GOOGLE_CSE_API_KEY and GOOGLE_CSE_CX in .env.local.");
  }

  const num = Math.min(10, Math.max(1, maxResults));
  const q = query.trim();
  if (!q) return [];

  const u = new URL("https://www.googleapis.com/customsearch/v1");
  u.searchParams.set("key", key);
  u.searchParams.set("cx", cx);
  u.searchParams.set("q", q);
  u.searchParams.set("num", String(num));

  const res = await fetch(u.toString(), { cache: "no-store" });
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Google search failed (${res.status}): ${errText.slice(0, 200)}`);
  }

  const json = (await res.json()) as { items?: GoogleCseItem[] };
  const items = json.items ?? [];
  const out: DiscoveredCandidate[] = [];

  for (const item of items) {
    const link = item.link?.trim();
    if (!link || shouldSkipUrl(link)) continue;
    const displayHost = item.displayLink ?? normalizeHostname(link) ?? "";
    const title = item.title ?? displayHost;
    const snippet = item.snippet ?? "";
    const companyName = companyNameFromResult(title, displayHost);
    const suggestedEmail = guessContactEmail(link);

    out.push({
      id: randomUUID(),
      companyName,
      websiteUrl: link,
      snippet,
      displayHost,
      suggestedEmail,
    });
  }

  return out;
}

async function fetchGoogleCsePage(params: {
  query: string;
  num: number;
  start: number;
}): Promise<{ items: GoogleCseItem[]; nextStart: number | null }> {
  const key = process.env.GOOGLE_CSE_API_KEY?.trim();
  const cx = process.env.GOOGLE_CSE_CX?.trim();
  if (!key || !cx) throw new Error("Web discovery is not configured. Set GOOGLE_CSE_API_KEY and GOOGLE_CSE_CX in .env.local.");

  const u = new URL("https://www.googleapis.com/customsearch/v1");
  u.searchParams.set("key", key);
  u.searchParams.set("cx", cx);
  u.searchParams.set("q", params.query.trim());
  u.searchParams.set("num", String(Math.min(10, Math.max(1, params.num))));
  u.searchParams.set("start", String(Math.max(1, params.start)));

  const res = await fetch(u.toString(), { cache: "no-store" });
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Google search failed (${res.status}): ${errText.slice(0, 200)}`);
  }

  const json = (await res.json()) as GoogleCseResponse;
  const items = json.items ?? [];
  const nextStart = json.queries?.nextPage?.[0]?.startIndex ?? null;
  return { items, nextStart: typeof nextStart === "number" ? nextStart : null };
}

/**
 * High-volume search: paginate Google CSE results. Note: Google CSE has quotas and may cap total results.
 */
export async function searchGoogleForLeadsPaged(params: {
  query: string;
  totalMaxResults: number;
  pageSize?: number;
  maxPages?: number;
  throttleMs?: number;
}): Promise<DiscoveredCandidate[]> {
  const totalMax = Math.min(100, Math.max(1, Math.floor(params.totalMaxResults)));
  const pageSize = Math.min(10, Math.max(1, Math.floor(params.pageSize ?? 10)));
  const maxPages = Math.min(10, Math.max(1, Math.floor(params.maxPages ?? 10)));
  const throttleMs = Math.min(3000, Math.max(0, Math.floor(params.throttleMs ?? 250)));

  const q = params.query.trim();
  if (!q) return [];

  const out: DiscoveredCandidate[] = [];
  let start = 1;
  let pages = 0;

  while (out.length < totalMax && pages < maxPages) {
    const { items, nextStart } = await fetchGoogleCsePage({ query: q, num: pageSize, start });
    for (const item of items) {
      const link = item.link?.trim();
      if (!link || shouldSkipUrl(link)) continue;
      const displayHost = item.displayLink ?? normalizeHostname(link) ?? "";
      const title = item.title ?? displayHost;
      const snippet = item.snippet ?? "";
      const companyName = companyNameFromResult(title, displayHost);
      const suggestedEmail = guessContactEmail(link);
      out.push({
        id: randomUUID(),
        companyName,
        websiteUrl: link,
        snippet,
        displayHost,
        suggestedEmail,
      });
      if (out.length >= totalMax) break;
    }

    pages += 1;
    if (!nextStart || nextStart === start) break;
    start = nextStart;
    if (throttleMs > 0) await new Promise((r) => setTimeout(r, throttleMs));
  }

  return out.slice(0, totalMax);
}
