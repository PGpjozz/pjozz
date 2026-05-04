import type { LeadStatus } from "@/types";

export const STATUS_BADGE: Record<
  LeadStatus,
  { label: string; className: string }
> = {
  new: { label: "New", className: "bg-zinc-600/30 text-zinc-200 ring-1 ring-zinc-500/40" },
  contacted: { label: "Contacted", className: "bg-blue-600/25 text-blue-200 ring-1 ring-blue-500/40" },
  qualified: { label: "Qualified", className: "bg-teal-600/25 text-teal-100 ring-1 ring-teal-500/40" },
  meeting: { label: "Meeting", className: "bg-purple-600/25 text-purple-100 ring-1 ring-purple-500/40" },
  proposal: { label: "Proposal", className: "bg-orange-600/25 text-orange-100 ring-1 ring-orange-500/40" },
  won: { label: "Won", className: "bg-emerald-600/25 text-emerald-100 ring-1 ring-emerald-500/40" },
  lost: { label: "Lost", className: "bg-red-600/25 text-red-100 ring-1 ring-red-500/40" },
};

export const SERVICE_LABEL: Record<string, string> = {
  webapp: "Web app",
  mobileapp: "Mobile",
  automation: "Automation",
  network: "Network",
  security_cam: "Security cams",
  software: "Software",
};
