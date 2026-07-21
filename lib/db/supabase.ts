import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { Database, LeadServiceType, LeadStatus, Tables, TablesInsert, TablesUpdate } from "./database.types";

export type { Database } from "./database.types";
export type {
  AIInsightPriority,
  AIInsightType,
  CampaignEnrollmentStatus,
  CampaignStatus,
  CampaignType,
  Json,
  LeadServiceType,
  LeadStatus,
  OutreachEventType,
  ProposalStatus,
  Tables,
  TablesInsert,
  TablesUpdate,
} from "./database.types";

export type LeadSortField = "created_at" | "updated_at" | "lead_score" | "company_name";

export type LeadFilters = {
  status?: LeadStatus;
  serviceType?: LeadServiceType;
  minScore?: number;
  maxScore?: number;
  /** Case-insensitive match on company, contact, or email */
  search?: string;
  limit?: number;
  offset?: number;
  sortBy?: LeadSortField;
  sortDir?: "asc" | "desc";
};

export type TypedSupabaseClient = SupabaseClient<Database>;

let browserClient: TypedSupabaseClient | null = null;

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not set`);
  return v;
}

/** Server / API routes: service role bypasses RLS. */
export function createServerSupabaseClient(): TypedSupabaseClient {
  return createClient<Database>(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
    {
      global: {
        // Next.js caches fetch() GETs by default; settings/feature flags must be fresh.
        fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }),
      },
    }
  );
}

/**
 * Browser client (anon key + user JWT). RLS applies — use only with a logged-in user.
 */
export function getBrowserSupabase(): TypedSupabaseClient {
  if (!browserClient) {
    browserClient = createClient<Database>(
      requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
      requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
    );
  }
  return browserClient;
}

function escapeIlikePattern(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

function assertNoError<T>(result: {
  data: T | null;
  error: { message: string; code?: string } | null;
}): NonNullable<T> {
  if (result.error) {
    throw new Error(result.error.message);
  }
  if (result.data === null) {
    throw new Error("Expected row or rows from Supabase");
  }
  return result.data as NonNullable<T>;
}

/** List leads with optional filters. Uses the service-role server client. */
export async function getLeads(filters?: LeadFilters): Promise<Tables<"leads">[]> {
  const supabase = createServerSupabaseClient();
  let q = supabase.from("leads").select("*").order("created_at", { ascending: false });

  if (filters?.status) q = q.eq("status", filters.status);
  if (filters?.serviceType) q = q.eq("service_type", filters.serviceType);
  if (filters?.minScore !== undefined) q = q.gte("lead_score", filters.minScore);
  if (filters?.maxScore !== undefined) q = q.lte("lead_score", filters.maxScore);

  const sortField = filters?.sortBy ?? "created_at";
  const ascending = filters?.sortDir === "asc";
  q = q.order(sortField, { ascending });

  if (filters?.search?.trim()) {
    const raw = escapeIlikePattern(filters.search.trim());
    const p = `%${raw}%`;
    q = q.or(`company_name.ilike.${p},contact_name.ilike.${p},email.ilike.${p}`);
  }

  const limit = filters?.limit ?? 50;
  const offset = filters?.offset ?? 0;
  q = q.range(offset, offset + limit - 1);

  return assertNoError(await q);
}

/** Single lead or null. */
export async function getLeadById(id: string): Promise<Tables<"leads"> | null> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.from("leads").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function createLead(data: TablesInsert<"leads">): Promise<Tables<"leads">> {
  const supabase = createServerSupabaseClient();
  return assertNoError(
    await supabase.from("leads").insert(data).select("*").single()
  );
}

export async function updateLead(
  id: string,
  data: TablesUpdate<"leads">
): Promise<Tables<"leads">> {
  const supabase = createServerSupabaseClient();
  return assertNoError(
    await supabase.from("leads").update(data).eq("id", id).select("*").single()
  );
}

export type PipelineRowWithLead = Tables<"pipeline"> & {
  leads: Pick<
    Tables<"leads">,
    "id" | "company_name" | "contact_name" | "email" | "status"
  > | null;
};

/** Pipeline rows with embedded lead summary, ordered by stage then recency. */
export async function getPipeline(): Promise<PipelineRowWithLead[]> {
  const supabase = createServerSupabaseClient();
  return assertNoError(
    await supabase
      .from("pipeline")
      .select(
        `
        *,
        leads (
          id,
          company_name,
          contact_name,
          email,
          status
        )
      `
      )
      .order("stage", { ascending: true })
      .order("updated_at", { ascending: false })
  ) as PipelineRowWithLead[];
}

export async function getInsights(unreadOnly?: boolean): Promise<Tables<"ai_insights">[]> {
  const supabase = createServerSupabaseClient();
  let q = supabase.from("ai_insights").select("*").order("created_at", { ascending: false });
  if (unreadOnly) q = q.eq("is_read", false);
  return assertNoError(await q);
}

export async function markInsightRead(id: string): Promise<Tables<"ai_insights">> {
  const supabase = createServerSupabaseClient();
  return assertNoError(
    await supabase.from("ai_insights").update({ is_read: true }).eq("id", id).select("*").single()
  );
}

export async function getOutreachEventsForLead(leadId: string): Promise<Tables<"outreach_events">[]> {
  const supabase = createServerSupabaseClient();
  return assertNoError(
    await supabase
      .from("outreach_events")
      .select("*")
      .eq("lead_id", leadId)
      .order("created_at", { ascending: false })
  );
}

export async function getPipelineForLead(leadId: string): Promise<Tables<"pipeline"> | null> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.from("pipeline").select("*").eq("lead_id", leadId).maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function upsertPipelineForLead(
  leadId: string,
  patch: Pick<
    TablesUpdate<"pipeline">,
    "stage" | "probability" | "deal_value" | "expected_close_date" | "notes"
  >
): Promise<Tables<"pipeline">> {
  const supabase = createServerSupabaseClient();
  const payload = {
    lead_id: leadId,
    stage: patch.stage ?? "New",
    probability: patch.probability ?? 0,
    deal_value: patch.deal_value ?? null,
    expected_close_date: patch.expected_close_date ?? null,
    notes: patch.notes ?? null,
  };
  return assertNoError(
    await supabase.from("pipeline").upsert(payload, { onConflict: "lead_id" }).select("*").single()
  );
}

export async function getProposalsForLead(leadId: string): Promise<Tables<"proposals">[]> {
  const supabase = createServerSupabaseClient();
  return assertNoError(
    await supabase.from("proposals").select("*").eq("lead_id", leadId).order("created_at", { ascending: false })
  );
}

export type LeadStats = {
  total: number;
  newToday: number;
  qualified: number;
  avgScore: number;
};

export async function getLeadStats(): Promise<LeadStats> {
  const supabase = createServerSupabaseClient();
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const startIso = start.toISOString();

  const [totalRes, newTodayRes, qualifiedRes, scoresRes] = await Promise.all([
    supabase.from("leads").select("*", { count: "exact", head: true }),
    supabase.from("leads").select("*", { count: "exact", head: true }).gte("created_at", startIso),
    supabase.from("leads").select("*", { count: "exact", head: true }).eq("status", "qualified"),
    supabase.from("leads").select("lead_score"),
  ]);

  if (totalRes.error) throw new Error(totalRes.error.message);
  if (newTodayRes.error) throw new Error(newTodayRes.error.message);
  if (qualifiedRes.error) throw new Error(qualifiedRes.error.message);
  if (scoresRes.error) throw new Error(scoresRes.error.message);

  const scores = scoresRes.data ?? [];
  const avgScore =
    scores.length > 0 ? scores.reduce((s, r) => s + r.lead_score, 0) / scores.length : 0;

  return {
    total: totalRes.count ?? 0,
    newToday: newTodayRes.count ?? 0,
    qualified: qualifiedRes.count ?? 0,
    avgScore: Math.round(avgScore * 10) / 10,
  };
}
