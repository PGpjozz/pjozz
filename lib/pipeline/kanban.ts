import type { LeadStatus } from "@/lib/db/database.types";
import type { Tables } from "@/lib/db/supabase";

/** Kanban column titles (stored in `pipeline.stage`). */
export const KANBAN_STAGE_ORDER = [
  "New Leads",
  "Contacted",
  "Qualified",
  "Meeting Booked",
  "Proposal Sent",
  "Negotiation",
  "Won ✓",
  "Lost ✗",
] as const;

export type KanbanStage = (typeof KANBAN_STAGE_ORDER)[number];

export const COLUMN_META: Record<
  KanbanStage,
  { id: string; leadStatus: LeadStatus; headerClass: string }
> = {
  "New Leads": { id: "col_new", leadStatus: "new", headerClass: "" },
  Contacted: { id: "col_contacted", leadStatus: "contacted", headerClass: "" },
  Qualified: { id: "col_qualified", leadStatus: "qualified", headerClass: "" },
  "Meeting Booked": { id: "col_meeting", leadStatus: "meeting", headerClass: "" },
  "Proposal Sent": { id: "col_proposal", leadStatus: "proposal", headerClass: "" },
  Negotiation: { id: "col_negotiation", leadStatus: "proposal", headerClass: "" },
  "Won ✓": { id: "col_won", leadStatus: "won", headerClass: "border-emerald-500/50 bg-emerald-500/10" },
  "Lost ✗": { id: "col_lost", leadStatus: "lost", headerClass: "border-red-500/50 bg-red-500/10" },
};

export type PipelineBoardCard = {
  leadId: string;
  columnId: string;
  stage: KanbanStage;
  companyName: string;
  contactName: string | null;
  email: string | null;
  serviceType: string | null;
  leadScore: number;
  leadStatus: LeadStatus;
  dealValue: number | null;
  probability: number;
  pipelineUpdatedAt: string | null;
  lastActivityAt: string;
};

export function leadStatusToDefaultStage(status: LeadStatus): KanbanStage {
  const map: Record<LeadStatus, KanbanStage> = {
    new: "New Leads",
    contacted: "Contacted",
    qualified: "Qualified",
    meeting: "Meeting Booked",
    proposal: "Proposal Sent",
    won: "Won ✓",
    lost: "Lost ✗",
  };
  return map[status];
}

function normalizeLegacyStage(raw: string): KanbanStage | null {
  const s = raw.trim().toLowerCase();
  if (KANBAN_STAGE_ORDER.includes(raw as KanbanStage)) return raw as KanbanStage;
  if (s.includes("won")) return "Won ✓";
  if (s.includes("lost")) return "Lost ✗";
  if (s.includes("negotiation")) return "Negotiation";
  if (s.includes("proposal")) return "Proposal Sent";
  if (s.includes("meeting")) return "Meeting Booked";
  if (s.includes("qualified")) return "Qualified";
  if (s.includes("contact")) return "Contacted";
  if (s.includes("new")) return "New Leads";
  if (s.includes("discover")) return "New Leads";
  return null;
}

export function inferKanbanStage(
  lead: Tables<"leads">,
  pipeline: Pick<Tables<"pipeline">, "stage" | "updated_at"> | null
): KanbanStage {
  if (pipeline?.stage) {
    const direct = KANBAN_STAGE_ORDER.find((k) => k === pipeline.stage);
    if (direct) return direct;
    const norm = normalizeLegacyStage(pipeline.stage);
    if (norm) return norm;
  }
  return leadStatusToDefaultStage(lead.status);
}

export function stageToLeadStatus(stage: KanbanStage): LeadStatus {
  return COLUMN_META[stage].leadStatus;
}

export function columnIdToStage(columnId: string): KanbanStage {
  for (const s of KANBAN_STAGE_ORDER) {
    if (COLUMN_META[s].id === columnId) return s;
  }
  return "New Leads";
}

export function daysBetween(iso: string | null, end = Date.now()): number {
  if (!iso) return 0;
  const t = new Date(iso).getTime();
  return Math.floor((end - t) / 86_400_000);
}
