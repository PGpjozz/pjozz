import type { AIInsightType, AIInsightPriority, TablesInsert } from "@/lib/db/database.types";
import type { AIInsight } from "@/types";

function mapBriefAlertType(t: AIInsight["type"]): AIInsightType {
  if (t === "risk") return "warning";
  if (t === "opportunity") return "opportunity";
  if (t === "follow_up" || t === "lead_score" || t === "proposal") return "action_required";
  return "daily_brief";
}

export function insightRowsFromBriefAlerts(alerts: AIInsight[]): TablesInsert<"ai_insights">[] {
  return alerts.map((a) => ({
    type: mapBriefAlertType(a.type),
    message: a.message,
    priority: a.priority as AIInsightPriority,
    related_id: a.relatedId,
    related_type: a.relatedId ? "lead" : null,
    is_read: false,
  }));
}
