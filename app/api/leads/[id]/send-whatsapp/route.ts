import { NextResponse } from "next/server";
import { z } from "zod";

import { getLeadById } from "@/lib/db/supabase";
import { sendWhatsAppMessage } from "@/lib/whatsapp/twilio";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  message: z.string().min(1).max(1600),
  to: z.string().optional(),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const lead = await getLeadById(id);
    if (!lead) return NextResponse.json({ ok: false as const, error: "Lead not found" }, { status: 404 });

    const json: unknown = await req.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false as const, error: "Invalid body", issues: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const to = parsed.data.to ?? lead.whatsapp?.trim() ?? lead.phone?.trim();
    if (!to) {
      return NextResponse.json(
        { ok: false as const, error: "Lead has no whatsapp or phone; pass `to` in the JSON body" },
        { status: 400 }
      );
    }

    const result = await sendWhatsAppMessage({ to, body: parsed.data.message });
    return NextResponse.json({ ok: true as const, data: result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server error";
    const status = msg.includes("not set") || msg.includes("TWILIO") ? 503 : 500;
    return NextResponse.json({ ok: false as const, error: msg }, { status });
  }
}
