import { NextResponse } from "next/server";

import type { ActivityRow } from "@/lib/dashboard/activity-types";
import { createServerSupabaseClient } from "@/lib/db/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from("outreach_events")
      .select("id, type, created_at, lead_id, metadata, leads ( company_name )")
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) throw new Error(error.message);

    const rows: ActivityRow[] = (data ?? []).map((r) => {
      const lead = r.leads as { company_name: string } | { company_name: string }[] | null;
      const company = Array.isArray(lead) ? lead[0]?.company_name : lead?.company_name;
      return {
        id: r.id,
        type: r.type,
        created_at: r.created_at,
        lead_id: r.lead_id,
        metadata: r.metadata,
        lead_company: company ?? null,
      };
    });

    return NextResponse.json({ ok: true as const, data: { events: rows } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ ok: false as const, error: msg }, { status: 500 });
  }
}
