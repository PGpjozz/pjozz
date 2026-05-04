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

type GoogleCseItem = {
  title?: string;
  link?: string;
  snippet?: string;
  displayLink?: string;
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

  const res = await fetch(u.toString(), { cache: "no-store", next: { revalidate: 0 } });
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
