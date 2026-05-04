import type { LeadStatus } from "@/types";
import { cn } from "@/lib/utils";

import { STATUS_BADGE } from "./lead-constants";

export function StatusBadge({ status }: { status: LeadStatus }) {
  const cfg = STATUS_BADGE[status];
  return (
    <span
      className={cn(
        "inline-flex rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
        cfg.className
      )}
    >
      {cfg.label}
    </span>
  );
}
