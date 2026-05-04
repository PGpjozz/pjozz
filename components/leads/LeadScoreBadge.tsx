import { cn } from "@/lib/utils";

function scoreTone(score: number): string {
  if (score <= 30) return "bg-red-500/20 text-red-200 ring-red-500/40";
  if (score <= 60) return "bg-amber-500/20 text-amber-100 ring-amber-500/40";
  if (score <= 80) return "bg-sky-500/20 text-sky-100 ring-sky-500/40";
  return "bg-primary/15 text-primary ring-primary/50";
}

export function LeadScoreBadge({
  score,
  className,
  size = "md",
}: {
  score: number;
  className?: string;
  size?: "sm" | "md";
}) {
  const s = Math.max(0, Math.min(100, Math.round(score)));
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-md font-mono font-semibold tabular-nums ring-1",
        size === "sm" ? "min-w-[2.25rem] px-1.5 py-0.5 text-xs" : "min-w-[2.75rem] px-2 py-1 text-sm",
        scoreTone(s),
        className
      )}
    >
      {s}
    </span>
  );
}
