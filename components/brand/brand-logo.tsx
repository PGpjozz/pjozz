"use client";

import Image from "next/image";
import Link from "next/link";

import { BRAND_LOGO_PATH, BRAND_NAME } from "@/lib/brand";
import { cn } from "@/lib/utils";

type BrandLogoProps = {
  href?: string | null;
  /** Visual size preset */
  size?: "sm" | "md" | "lg";
  /** Show “Technologies” under the mark (operator sidebar). */
  showWordmark?: boolean;
  /** Light backgrounds (public proposal) vs dark marketing/operator chrome. */
  tone?: "dark" | "light";
  className?: string;
  priority?: boolean;
};

const SIZE = {
  sm: { box: "h-8 w-8", img: 32, word: "text-sm", sub: "text-[9px]" },
  md: { box: "h-10 w-10", img: 40, word: "text-base", sub: "text-[10px]" },
  lg: { box: "h-14 w-14", img: 56, word: "text-lg", sub: "text-xs" },
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
      <span
        className={cn(
          "relative shrink-0 overflow-hidden rounded-md",
          s.box,
          tone === "light" ? "bg-zinc-900" : "bg-transparent"
        )}
      >
        <Image
          src={BRAND_LOGO_PATH}
          alt={BRAND_NAME}
          width={s.img}
          height={s.img}
          className="h-full w-full object-contain"
          priority={priority}
        />
      </span>
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
