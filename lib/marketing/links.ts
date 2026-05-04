/** wa.me expects country code + number, no + or spaces, e.g. 27791234567 */
export function whatsappHref(): string {
  const n = process.env.NEXT_PUBLIC_WHATSAPP_E164?.replace(/\D/g, "");
  if (!n) return "https://wa.me/27000000000";
  return `https://wa.me/${n}`;
}

export const phoneTel = process.env.NEXT_PUBLIC_PHONE_TEL ?? "tel:+27000000000";
export const emailMailto = `mailto:${process.env.NEXT_PUBLIC_HELLO_EMAIL ?? "hello@pjozz.co.za"}`;
