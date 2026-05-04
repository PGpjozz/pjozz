import { NextResponse } from "next/server";

import { getLeadStats } from "@/lib/db/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const stats = await getLeadStats();
    return NextResponse.json({ ok: true as const, data: stats });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server error";
    const status = msg.includes("is not set") ? 503 : 500;
    return NextResponse.json({ ok: false as const, error: msg }, { status });
  }
}
