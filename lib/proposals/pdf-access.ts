import { cookies } from "next/headers";

import { ADMIN_COOKIE_NAME, verifyAdminSession } from "@/lib/auth/admin-session";

/**
 * Allow proposal PDF download when either:
 * - caller presents a matching share_token (public client link), or
 * - caller has a valid admin session cookie.
 */
export async function assertProposalPdfAccess(opts: {
  shareToken: string | null;
  requestToken: string | null;
}): Promise<{ ok: true } | { ok: false; status: 401 | 403; error: string }> {
  if (opts.requestToken && opts.shareToken && opts.requestToken === opts.shareToken) {
    return { ok: true };
  }

  const jar = cookies();
  const cookie = jar.get(ADMIN_COOKIE_NAME)?.value ?? null;
  const session = await verifyAdminSession(cookie);
  if (session) return { ok: true };

  if (!opts.requestToken) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }
  return { ok: false, status: 403, error: "Invalid token" };
}
