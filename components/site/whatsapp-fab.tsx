"use client";

import { MessageCircle } from "lucide-react";

import { whatsappHref } from "@/lib/marketing/links";

/**
 * Floating WhatsApp CTA for marketing pages. Hidden when no real number is configured
 * (avoids linking to the 27000000000 placeholder).
 */
export function WhatsAppFab() {
  const hasNumber = Boolean(process.env.NEXT_PUBLIC_WHATSAPP_E164?.replace(/\D/g, ""));
  if (!hasNumber) return null;

  return (
    <a
      href={whatsappHref()}
      target="_blank"
      rel="noreferrer"
      aria-label="Chat on WhatsApp"
      className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-full bg-emerald-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-900/40 transition hover:bg-emerald-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#030712] md:bottom-8 md:right-8"
    >
      <MessageCircle className="h-5 w-5" aria-hidden />
      <span className="hidden sm:inline">WhatsApp</span>
    </a>
  );
}
