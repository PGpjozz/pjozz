import type { Json } from "@/lib/db/database.types";
import { createServerSupabaseClient } from "@/lib/db/supabase";

import type { DailyBrief } from "./types";

const SETTINGS_KEY = "daily_brief_cache";

type CachePayload = { cachedAt: string; brief: DailyBrief };

/** Minutes. Unset → 60. Set `0` to disable caching (always call Claude). */
export function dailyBriefCacheTtlMs(): number {
  const raw = process.env.AI_DAILY_BRIEF_CACHE_TTL_MINUTES;
  if (raw?.trim() === "0") return 0;
  const mins = raw?.trim() ? Number.parseInt(raw, 10) : 60;
  if (!Number.isFinite(mins) || mins <= 0) return 0;
  return mins * 60_000;
}

export async function loadDailyBriefFromCache(): Promise<DailyBrief | null> {
  const ttl = dailyBriefCacheTtlMs();
  if (ttl <= 0) return null;
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.from("settings").select("value").eq("key", SETTINGS_KEY).maybeSingle();
  if (error || data?.value == null) return null;
  const v = data.value as unknown as Partial<CachePayload>;
  if (!v.cachedAt || !v.brief) return null;
  if (Date.now() - new Date(v.cachedAt).getTime() >= ttl) return null;
  return v.brief;
}

export async function saveDailyBriefToCache(brief: DailyBrief): Promise<void> {
  if (dailyBriefCacheTtlMs() <= 0) return;
  const supabase = createServerSupabaseClient();
  const now = new Date().toISOString();
  const payload: CachePayload = { cachedAt: now, brief };
  const { error } = await supabase.from("settings").upsert(
    { key: SETTINGS_KEY, value: payload as unknown as Json, updated_at: now },
    { onConflict: "key" }
  );
  if (error) console.warn("[daily-brief-cache] upsert failed:", error.message);
}
