import { NextResponse, type NextRequest } from "next/server";

import { ADMIN_COOKIE_NAME, verifyAdminSession } from "@/lib/auth/admin-session";

/**
 * Route access policy
 * ────────────────────
 * Public (unauthenticated) — everything in this list is reachable without an admin
 * session cookie. Everything else that this middleware sees is treated as operator
 * (admin-only) and redirected to `/login` when the cookie is missing/invalid.
 */

/** Exact-match public routes. */
const PUBLIC_EXACT = new Set<string>([
  "/",
  "/login",
  "/privacy",
  "/terms",
  "/robots.txt",
  "/sitemap.xml",
  "/api/auth/login",
  "/api/auth/logout",
  "/api/contact",
  "/api/quote",
  "/api/og",
  "/api/campaigns/pending-sends",
  "/api/settings/proposals.defaults",
]);

/** Public route prefixes (marketing site + public proposal share + inbound automation). */
const PUBLIC_PREFIXES: readonly string[] = [
  "/about",
  "/services",
  "/solutions",
  "/projects",
  "/portal",
  "/demo",
  "/contact",
  "/client",
  "/p/",
  "/api/og",
  "/api/track/",
  "/api/webhooks/",
  "/api/automation/",
];

/** Public regex patterns for parameterised routes. */
const PUBLIC_PATTERNS: readonly RegExp[] = [
  /^\/api\/proposals\/[^/]+\/accept$/,
  /^\/api\/proposals\/[^/]+\/request-changes$/,
  /^\/api\/proposals\/[^/]+\/pdf$/,
  /^\/api\/proposals\/[^/]+\/quote-pdf$/,
  /^\/api\/campaigns\/[^/]+\/send-next$/,
];

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_EXACT.has(pathname)) return true;
  for (const prefix of PUBLIC_PREFIXES) if (pathname.startsWith(prefix)) return true;
  for (const rx of PUBLIC_PATTERNS) if (rx.test(pathname)) return true;
  return false;
}

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  if (isPublicPath(pathname)) return NextResponse.next();

  const token = req.cookies.get(ADMIN_COOKIE_NAME)?.value ?? null;
  const session = await verifyAdminSession(token);
  if (session) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const loginUrl = req.nextUrl.clone();
  loginUrl.pathname = "/login";
  loginUrl.search = "";
  const nextPath = `${pathname}${search ?? ""}`;
  if (nextPath && nextPath !== "/login") loginUrl.searchParams.set("next", nextPath);

  const res = NextResponse.redirect(loginUrl);
  if (token) res.cookies.delete(ADMIN_COOKIE_NAME);
  return res;
}

/**
 * Skip static assets & Next internals; run on everything else so both pages and
 * API routes are protected.
 */
export const config = {
  matcher: ["/((?!_next/|favicon\\.ico|brand/|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|txt|xml|map)$).*)"],
};
