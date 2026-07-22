/**
 * Admin session tokens — signed, stateless, cookie-based.
 *
 * Format: `<payloadB64Url>.<sigB64Url>` where `payload` is a JSON blob
 * `{ v:1, sub:"admin", role:"admin", iat:<unix>, exp:<unix> }` and `sig` is
 * HMAC-SHA256(ADMIN_SESSION_SECRET, payloadB64Url).
 *
 * Uses Web Crypto (globalThis.crypto.subtle) so the same code runs in Edge
 * middleware and Node route handlers.
 */

export const ADMIN_COOKIE_NAME = "pjozz_admin";
/** Default session lifetime: 7 days. */
export const ADMIN_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

export type AdminSessionPayload = {
  v: 1;
  sub: "admin";
  role: "admin";
  iat: number;
  exp: number;
};

function base64UrlEncode(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.byteLength; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlDecode(str: string): Uint8Array {
  const pad = str.length % 4 === 0 ? "" : "=".repeat(4 - (str.length % 4));
  const bin = atob(str.replace(/-/g, "+").replace(/_/g, "/") + pad);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function textToBytes(s: string): Uint8Array {
  return new TextEncoder().encode(s);
}

function bytesToText(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes);
}

/** Constant-time equality on byte arrays. */
function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.byteLength !== b.byteLength) return false;
  let diff = 0;
  for (let i = 0; i < a.byteLength; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

async function importHmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    textToBytes(secret) as unknown as BufferSource,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

function getSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error(
      "ADMIN_SESSION_SECRET is not set (or is shorter than 16 chars). Refuse to sign/verify admin sessions."
    );
  }
  return secret;
}

/** Sign an admin session payload and return the cookie value. */
export async function signAdminSession(
  ttlSeconds: number = ADMIN_SESSION_MAX_AGE_SECONDS
): Promise<{ token: string; payload: AdminSessionPayload }> {
  const now = Math.floor(Date.now() / 1000);
  const payload: AdminSessionPayload = {
    v: 1,
    sub: "admin",
    role: "admin",
    iat: now,
    exp: now + Math.max(60, ttlSeconds),
  };
  const payloadB64 = base64UrlEncode(textToBytes(JSON.stringify(payload)));
  const key = await importHmacKey(getSecret());
  const sig = new Uint8Array(
    await crypto.subtle.sign("HMAC", key, textToBytes(payloadB64) as unknown as BufferSource)
  );
  return { token: `${payloadB64}.${base64UrlEncode(sig)}`, payload };
}

/** Verify a cookie value. Returns the payload if valid & unexpired, else null. */
export async function verifyAdminSession(
  token: string | null | undefined
): Promise<AdminSessionPayload | null> {
  if (!token || typeof token !== "string") return null;
  const dot = token.indexOf(".");
  if (dot <= 0 || dot === token.length - 1) return null;
  const payloadB64 = token.slice(0, dot);
  const sigB64 = token.slice(dot + 1);

  let secret: string;
  try {
    secret = getSecret();
  } catch {
    return null;
  }

  const key = await importHmacKey(secret);
  let providedSig: Uint8Array;
  try {
    providedSig = base64UrlDecode(sigB64);
  } catch {
    return null;
  }
  const expectedSig = new Uint8Array(
    await crypto.subtle.sign("HMAC", key, textToBytes(payloadB64) as unknown as BufferSource)
  );
  if (!timingSafeEqual(providedSig, expectedSig)) return null;

  let payload: AdminSessionPayload;
  try {
    payload = JSON.parse(bytesToText(base64UrlDecode(payloadB64))) as AdminSessionPayload;
  } catch {
    return null;
  }
  if (payload?.v !== 1 || payload.sub !== "admin" || payload.role !== "admin") return null;
  const now = Math.floor(Date.now() / 1000);
  if (typeof payload.exp !== "number" || payload.exp <= now) return null;
  return payload;
}

/** Cookie options used when setting/clearing the admin session. */
export function adminCookieOptions(maxAgeSeconds: number) {
  const isProd = process.env.NODE_ENV === "production" || Boolean(process.env.VERCEL);
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: isProd,
    path: "/",
    maxAge: maxAgeSeconds,
  };
}
