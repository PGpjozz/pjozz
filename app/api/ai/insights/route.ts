import { NextResponse } from "next/server";

import type { AIInsightPriority } from "@/lib/db/database.types";
import { createServerSupabaseClient } from "@/lib/db/supabase";

export const dynamic = "force-dynamic";

const PRIORITY_ORDER: Record<AIInsightPriority, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const unreadOnly = url.searchParams.get("unread") !== "false";

    const supabase = createServerSupabaseClient();
    let q = supabase.from("ai_insights").select("*").order("created_at", { ascending: false });
    if (unreadOnly) q = q.eq("is_read", false);
    const { data, error } = await q;
    if (error) throw new Error(error.message);

    const rows = [...(data ?? [])].sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);

    return NextResponse.json({ ok: true as const, data: { insights: rows } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ ok: false as const, error: msg }, { status: 500 });
  }
}
