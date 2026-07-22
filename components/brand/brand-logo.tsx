"use client";

import Link from "next/link";

import { BRAND_LOGO_PATH, BRAND_NAME } from "@/lib/brand";
import { cn } from "@/lib/utils";

type BrandLogoProps = {
  href?: string | null;
  /** Visual size preset */
  size?: "sm" | "md" | "lg";
  /** Show “Technologies” under the mark (logo artwork already includes “jozz”). */
  showWordmark?: boolean;
  /** Light backgrounds (public proposal) vs dark marketing/operator chrome. */
  tone?: "dark" | "light";
  className?: string;
  priority?: boolean;
};

/** Full lockup is roughly square; keep it large enough to read on dark UIs. */
const SIZE = {
  sm: { img: "h-10 w-10", word: "text-xs", sub: "text-[9px]" },
  md: { img: "h-14 w-14", word: "text-sm", sub: "text-[10px]" },
  lg: { img: "h-24 w-24", word: "text-base", sub: "text-xs" },
} as const;

export function BrandLogo({
  href = "/",
  size = "md",
  showWordmark = true,
  tone = "dark",
  className,
  priority,
}: BrandLogoProps) {
  const s = SIZE[size];
  const inner = (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      {/* Native img: logo has a dark plate; next/image crop made it look blank. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={BRAND_LOGO_PATH}
        alt={BRAND_NAME}
        width={96}
        height={96}
        className={cn("shrink-0 rounded-md object-contain", s.img)}
        decoding="async"
        {...(priority ? { fetchPriority: "high" as const } : {})}
      />
      {showWordmark ? (
        <span className="leading-tight">
          <span
            className={cn(
              "font-heading font-semibold tracking-tight",
              s.word,
              tone === "light" ? "text-zinc-900" : "text-foreground"
            )}
          >
            Pjozz
            <span className={tone === "light" ? "text-[#00a67e]" : "text-primary"}>.</span>
          </span>
          <span
            className={cn(
              "block font-medium uppercase tracking-wider",
              s.sub,
              tone === "light" ? "text-zinc-500" : "text-muted-foreground"
            )}
          >
            Technologies
          </span>
        </span>
      ) : null}
    </span>
  );

  if (!href) return inner;
  return (
    <Link href={href} className="transition-opacity hover:opacity-90" aria-label={BRAND_NAME}>
      {inner}
    </Link>
  );
}
