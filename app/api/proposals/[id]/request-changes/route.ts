import { NextResponse } from "next/server";
import { z } from "zod";

import { createServerSupabaseClient, getLeadById } from "@/lib/db/supabase";
import { sendTransactionalEmail } from "@/lib/email/resend";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  token: z.string().min(10).max(200),
  message: z.string().min(1).max(4000),
});

function opsEmail(): string | null {
  return process.env.PJozZ_TEAM_EMAIL ?? process.env.OPS_NOTIFY_EMAIL ?? null;
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const json: unknown = await req.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false as const, error: "Invalid body", issues: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();
    const { data: row, error } = await supabase.from("proposals").select("*").eq("id", id).maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) return NextResponse.json({ ok: false as const, error: "Not found" }, { status: 404 });
    if (row.share_token !== parsed.data.token) {
      return NextResponse.json({ ok: false as const, error: "Invalid token" }, { status: 403 });
    }

    await supabase
      .from("proposals")
      .update({ change_request_note: parsed.data.message })
      .eq("id", id);

    const lead = row.lead_id ? await getLeadById(row.lead_id) : null;
    const notify = opsEmail();
    if (notify) {
      await sendTransactionalEmail({
        to: notify,
        subject: `Change request: ${row.title}`,
        html: `<p><strong>${lead?.company_name ?? "Client"}</strong> requested changes on proposal <strong>${row.title}</strong>.</p><blockquote style="border-left:3px solid #00e5a0;padding-left:12px;color:#333">${escapeHtml(parsed.data.message)}</blockquote>`,
      });
    }

    return NextResponse.json({ ok: true as const });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server error";
    const status = msg.includes("is not set") ? 503 : 500;
    return NextResponse.json({ ok: false as const, error: msg }, { status });
  }
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
