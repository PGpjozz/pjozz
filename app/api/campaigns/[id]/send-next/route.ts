import { NextResponse } from "next/server";

import { assertAutomationInbound } from "@/lib/automation/auth";
import { runCampaignSendNext } from "@/lib/campaigns/process-send-next";
import { getSetting } from "@/lib/settings/store";

export const dynamic = "force-dynamic";

/** POST — n8n / cron: send next sequence messages for active enrollments (respects SAST window + daily cap). */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const flags = await getSetting("features.flags");
    if (flags.enableOutreachAutomation === false) {
      return NextResponse.json({ ok: false as const, error: "Outreach automation is disabled in settings." }, { status: 503 });
    }

    assertAutomationInbound(req);
    const { id } = await params;
    const result = await runCampaignSendNext(id);
    return NextResponse.json({ ok: true as const, data: result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server error";
    const status = msg === "Unauthorized" ? 401 : msg.includes("is not set") ? 503 : 500;
    return NextResponse.json({ ok: false as const, error: msg }, { status });
  }
}
