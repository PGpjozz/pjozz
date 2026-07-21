import { NextResponse } from "next/server";

import { buildDashboardSnapshot, generateDailyBrief } from "@/lib/ai/daily-brief";
import { loadDailyBriefFromCache, saveDailyBriefToCache } from "@/lib/ai/daily-brief-cache";
import { insightRowsFromBriefAlerts } from "@/lib/ai/persist-brief-insights";
import { createServerSupabaseClient } from "@/lib/db/supabase";
import { getSetting } from "@/lib/settings/store";

import { aiErrorResponse } from "../_utils";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const flags = await getSetting("features.flags");
    if (flags.enableAi === false) {
      return NextResponse.json({ ok: false as const, error: "AI is disabled in settings." }, { status: 503 });
    }

    const force = new URL(req.url).searchParams.get("refresh") === "1";
    const debug = new URL(req.url).searchParams.get("debug") === "1";
    if (!force) {
      const cached = await loadDailyBriefFromCache();
      if (cached) {
        return NextResponse.json({
          ok: true as const,
          data: cached,
          cached: true as const,
          ...(debug && process.env.NODE_ENV !== "production" ? { debug: { note: "served from cache" } } : {}),
        });
      }
    }

    const snapshot = await buildDashboardSnapshot();
    const brief = await generateDailyBrief(snapshot);
    await saveDailyBriefToCache(brief);

    try {
      const supabase = createServerSupabaseClient();
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { data: recent } = await supabase.from("ai_insights").select("message").eq("is_read", false).gte("created_at", oneHourAgo);
      const seen = new Set((recent ?? []).map((r) => r.message));
      const rows = insightRowsFromBriefAlerts(brief.alerts).filter((r) => !seen.has(r.message));
      if (rows.length) await supabase.from("ai_insights").insert(rows);
    } catch {
      /* insights insert is best-effort */
    }
    return NextResponse.json({
      ok: true as const,
      data: brief,
      cached: false as const,
      ...(debug && process.env.NODE_ENV !== "production" ? { debug: { snapshot } } : {}),
    });
  } catch (e) {
    return aiErrorResponse("daily-brief", e);
  }
}
