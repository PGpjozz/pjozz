import { NextResponse } from "next/server";
import { z } from "zod";

import { createServerSupabaseClient, getLeadById } from "@/lib/db/supabase";
import { sendTransactionalEmail } from "@/lib/email/resend";
import { generateShareToken } from "@/lib/proposals/document";
import { buildProposalClientEmailHtml, publicProposalUrl } from "@/lib/proposals/proposal-email";
import { rowToProposalDocument } from "@/lib/proposals/document";
import { getSetting } from "@/lib/settings/store";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  toEmail: z.string().email().optional(),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const flags = await getSetting("features.flags");
    if (flags.enableResendEmail === false) {
      return NextResponse.json({ ok: false as const, error: "Email sending is disabled in settings." }, { status: 503 });
    }

    const { id } = await params;
    const json: unknown = await req.json().catch(() => ({}));
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

    const doc = rowToProposalDocument(row);
    if (!doc) return NextResponse.json({ ok: false as const, error: "Proposal has no document content" }, { status: 400 });

    const leadRow = row.lead_id ? await getLeadById(row.lead_id) : null;
    const to = parsed.data.toEmail ?? leadRow?.email ?? null;
    if (!to) return NextResponse.json({ ok: false as const, error: "No recipient email" }, { status: 400 });

    const token = row.share_token ?? generateShareToken();
    const url = publicProposalUrl(token);

    const { error: uErr } = await supabase
      .from("proposals")
      .update({
        share_token: token,
        status: "sent",
        sent_at: new Date().toISOString(),
      })
      .eq("id", id);
    if (uErr) throw new Error(uErr.message);

    const subject = `Proposal: ${doc.title}`;
    const html = buildProposalClientEmailHtml({
      proposalTitle: doc.title,
      companyName: leadRow?.company_name ?? "there",
      publicUrl: url,
    });

    await sendTransactionalEmail({ to, subject, html });

    return NextResponse.json({ ok: true as const, data: { shareUrl: url } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server error";
    const status = msg.includes("is not set") || msg.includes("RESEND") ? 503 : 500;
    return NextResponse.json({ ok: false as const, error: msg }, { status });
  }
}
