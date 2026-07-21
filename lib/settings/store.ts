import type { Json } from "@/lib/db/database.types";
import { createServerSupabaseClient } from "@/lib/db/supabase";

import { SETTINGS_REGISTRY, normalizeProposalsDefaults, type SettingsKey, type SettingsValueMap } from "./registry";

export async function getSetting<K extends SettingsKey>(key: K): Promise<SettingsValueMap[K]> {
  const entry = SETTINGS_REGISTRY[key];
  try {
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase.from("settings").select("value").eq("key", key).maybeSingle();
    if (error || data?.value == null) return entry.defaultValue;
    const parsed = entry.schema.safeParse(data.value);
    const value = (parsed.success ? parsed.data : entry.defaultValue) as SettingsValueMap[K];
    if (key === "proposals.defaults") {
      return normalizeProposalsDefaults(value as SettingsValueMap["proposals.defaults"]) as SettingsValueMap[K];
    }
    return value;
  } catch {
    // Network / DNS / missing env — fall back so the UI still boots.
    return entry.defaultValue;
  }
}

export async function setSetting<K extends SettingsKey>(
  key: K,
  value: SettingsValueMap[K]
): Promise<SettingsValueMap[K]> {
  const entry = SETTINGS_REGISTRY[key];
  const parsed = entry.schema.safeParse(value);
  if (!parsed.success) {
    throw new Error(parsed.error.message);
  }
  const supabase = createServerSupabaseClient();
  const now = new Date().toISOString();
  const payload: { key: string; value: Json; updated_at: string } = {
    key,
    value: parsed.data as unknown as Json,
    updated_at: now,
  };
  const { data, error } = await supabase
    .from("settings")
    .upsert(payload, { onConflict: "key" })
    .select("value")
    .eq("key", key)
    .maybeSingle();
  if (error) throw new Error(error.message);
  const out = entry.schema.safeParse(data?.value);
  return (out.success ? out.data : parsed.data) as SettingsValueMap[K];
}

