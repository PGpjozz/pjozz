import { NextResponse } from "next/server";

import { runCampaignSendNext } from "@/lib/campaigns/process-send-next";

export const dynamic = "force-dynamic";

function assertCronAuth(req: Request) {
  const secret = process.env.OUTREACH_CRON_SECRET ?? process.env.N8N_INBOUND_SECRET;
  if (!secret) return;
  const auth = req.headers.get("authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  if (token !== secret) {
    throw new Error("Unauthorized");
  }
}

/** POST — n8n / cron: send next sequence messages for active enrollments (respects SAST window + daily cap). */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    assertCronAuth(req);
    const { id } = await params;
    const result = await runCampaignSendNext(id);
    return NextResponse.json({ ok: true as const, data: result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server error";
    const status = msg === "Unauthorized" ? 401 : msg.includes("is not set") ? 503 : 500;
    return NextResponse.json({ ok: false as const, error: msg }, { status });
  }
}
