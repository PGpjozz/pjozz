import { NextResponse } from "next/server";

import { getOutreachEventsForLead } from "@/lib/db/supabase";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const events = await getOutreachEventsForLead(id);
    return NextResponse.json({ ok: true as const, data: events });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server error";
    const status = msg.includes("is not set") ? 503 : 500;
    return NextResponse.json({ ok: false as const, error: msg }, { status });
  }
}
