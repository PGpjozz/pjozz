import { NextResponse } from "next/server";
import { z } from "zod";

import { getLeadById } from "@/lib/db/supabase";
import { sendTransactionalEmail } from "@/lib/email/resend";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  subject: z.string().min(1),
  html: z.string().min(1),
  to: z.string().email().optional(),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const lead = await getLeadById(id);
    if (!lead?.email) {
      return NextResponse.json({ ok: false as const, error: "Lead has no email" }, { status: 400 });
    }
    const json: unknown = await req.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false as const, error: "Invalid body", issues: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const to = parsed.data.to ?? lead.email;
    const result = await sendTransactionalEmail({
      to,
      subject: parsed.data.subject,
      html: parsed.data.html,
    });
    return NextResponse.json({ ok: true as const, data: result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server error";
    const status =
      msg.includes("RESEND") || msg.includes("not set") ? 503 : msg.includes("Invalid") ? 400 : 500;
    return NextResponse.json({ ok: false as const, error: msg }, { status });
  }
}
