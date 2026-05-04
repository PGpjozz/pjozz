import type { LeadServiceType, LeadStatus } from "@/lib/db/database.types";
import type { LeadSortField, TypedSupabaseClient } from "@/lib/db/supabase";

export type LeadsListFilters = {
  search?: string;
  status?: LeadStatus;
  serviceType?: LeadServiceType;
  minScore?: number;
  maxScore?: number;
  sortBy?: LeadSortField;
  sortDir?: "asc" | "desc";
};

function escapeIlikePattern(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

/** Apply shared list filters to a leads query builder. */
export function applyLeadListFilters(
  supabase: TypedSupabaseClient,
  filters: LeadsListFilters
) {
  let q = supabase.from("leads").select("*", { count: "exact" });

  if (filters.status) q = q.eq("status", filters.status);
  if (filters.serviceType) q = q.eq("service_type", filters.serviceType);
  if (filters.minScore !== undefined) q = q.gte("lead_score", filters.minScore);
  if (filters.maxScore !== undefined) q = q.lte("lead_score", filters.maxScore);

  if (filters.search?.trim()) {
    const raw = escapeIlikePattern(filters.search.trim());
    const p = `%${raw}%`;
    q = q.or(`company_name.ilike.${p},contact_name.ilike.${p},email.ilike.${p}`);
  }

  const sortField = filters.sortBy ?? "created_at";
  const ascending = filters.sortDir === "asc";
  q = q.order(sortField, { ascending });

  return q;
}

export async function fetchLatestOutreachByLeadIds(
  supabase: TypedSupabaseClient,
  leadIds: string[]
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (leadIds.length === 0) return map;
  const { data, error } = await supabase
    .from("outreach_events")
    .select("lead_id, created_at")
    .in("lead_id", leadIds);
  if (error) throw new Error(error.message);
  for (const row of data ?? []) {
    if (!row.lead_id) continue;
    const cur = map.get(row.lead_id);
    if (!cur || row.created_at > cur) map.set(row.lead_id, row.created_at);
  }
  return map;
}
