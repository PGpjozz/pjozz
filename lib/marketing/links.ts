import { siteEmail, sitePhoneHref, whatsappE164 } from "@/lib/site-config";

/** wa.me expects country code + number, no + or spaces, e.g. 27791234567 */
export function whatsappHref(): string {
  const n = whatsappE164();
  if (!n) return "https://wa.me/27000000000";
  const text = encodeURIComponent("Hi Pjozz — I'd like to talk about a project.");
  return `https://wa.me/${n}?text=${text}`;
}

export function phoneTel(): string {
  return sitePhoneHref();
}

export function emailMailto(): string {
  return `mailto:${siteEmail()}`;
}

/** @deprecated Prefer phoneTel() — kept for older imports that treated this as a constant. */
export const phoneTelHref = sitePhoneHref();
/** @deprecated Prefer emailMailto() */
export const emailMailtoHref = `mailto:${siteEmail()}`;
