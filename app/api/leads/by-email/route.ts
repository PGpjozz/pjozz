import { NextResponse } from "next/server";
import { z } from "zod";

import { assertAutomationInbound } from "@/lib/automation/auth";
import { findLeadByEmail } from "@/lib/automation/n8n-handlers";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  email: z.string().email(),
});

export async function GET(req: Request) {
  try {
    assertAutomationInbound(req);
    const url = new URL(req.url);
    const parsed = querySchema.safeParse({ email: url.searchParams.get("email") ?? "" });
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false as const, error: "Invalid query", issues: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const lead = await findLeadByEmail(parsed.data.email);
    if (!lead) return NextResponse.json({ ok: false as const, error: "Not found" }, { status: 404 });
    return NextResponse.json({ ok: true as const, data: { lead } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server error";
    const status = msg === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ ok: false as const, error: msg }, { status });
  }
}
