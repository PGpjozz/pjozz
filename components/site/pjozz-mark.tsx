"use client";

import { BrandLogo } from "@/components/brand/brand-logo";

/** Marketing header mark — full logo artwork. */
export function PjozzMark({ className = "" }: { className?: string }) {
  return <BrandLogo href={null} size="md" showWordmark tone="dark" className={className} priority />;
}
