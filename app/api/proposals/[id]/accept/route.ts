import { NextResponse } from "next/server";
import { z } from "zod";

import { ensureClientAndInvoiceFromProposal } from "@/lib/billing/invoice-from-proposal";
import type { Json, TablesInsert } from "@/lib/db/database.types";
import { createServerSupabaseClient, getLeadById, upsertPipelineForLead } from "@/lib/db/supabase";
import { sendTransactionalEmail } from "@/lib/email/resend";
import { leadStatusToDefaultStage } from "@/lib/pipeline/kanban";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  token: z.string().min(10).max(200),
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

    if (row.status === "expired" || row.status === "rejected" || row.status === "draft") {
      return NextResponse.json(
        { ok: false as const, error: "This proposal can no longer be accepted." },
        { status: 409 }
      );
    }

    if (row.status === "accepted") {
      try {
        const r = await ensureClientAndInvoiceFromProposal(id);
        return NextResponse.json({
          ok: true as const,
          data: { alreadyAccepted: true, invoiceId: r.invoiceId, clientId: r.clientId },
        });
      } catch (invErr) {
        return NextResponse.json({
          ok: true as const,
          data: {
            alreadyAccepted: true,
            invoiceId: null,
            invoiceError: invErr instanceof Error ? invErr.message : "Invoice create failed",
          },
        });
      }
    }

    const { error: uErr } = await supabase
      .from("proposals")
      .update({
        status: "accepted",
        accepted_at: new Date().toISOString(),
      })
      .eq("id", id);
    if (uErr) throw new Error(uErr.message);

    const { error: oeErr } = await supabase.from("outreach_events").insert({
      lead_id: row.lead_id,
      campaign_id: null,
      type: "proposal_accepted",
      metadata: { proposal_id: id, title: row.title } as Json,
    });
    if (oeErr) console.warn("[accept] outreach_events insert:", oeErr.message);

    const lead = row.lead_id ? await getLeadById(row.lead_id) : null;
    if (lead) {
      const { data: existing } = await supabase.from("clients").select("id").eq("lead_id", lead.id).maybeSingle();
      if (!existing) {
        const clientPayload: TablesInsert<"clients"> = {
          lead_id: lead.id,
          company_name: lead.company_name,
          contact_name: lead.contact_name,
          email: lead.email,
          phone: lead.phone,
          retainer_active: false,
          retainer_amount: null,
          total_revenue: 0,
        };
        const { error: cErr } = await supabase.from("clients").insert(clientPayload);
        if (cErr) throw new Error(cErr.message);
      }

      const { error: leadErr } = await supabase.from("leads").update({ status: "won" }).eq("id", lead.id);
      if (leadErr) console.warn("[accept] lead won:", leadErr.message);

      try {
        await upsertPipelineForLead(lead.id, {
          stage: leadStatusToDefaultStage("won"),
          probability: 100,
          deal_value: row.total_value != null ? Number(row.total_value) : null,
          expected_close_date: new Date().toISOString(),
          notes: `Won via accepted proposal: ${row.title}`,
        });
      } catch (pipeErr) {
        console.warn("[accept] pipeline update:", pipeErr);
      }
    }

    let invoiceId: string | null = null;
    let clientId: string | null = null;
    let invoiceError: string | null = null;
    try {
      const created = await ensureClientAndInvoiceFromProposal(id);
      invoiceId = created.invoiceId;
      clientId = created.clientId;
    } catch (invErr) {
      invoiceError = invErr instanceof Error ? invErr.message : "Invoice create failed";
      console.warn("[accept] invoice create:", invErr);
    }

    if (lead?.email) {
      try {
        await sendTransactionalEmail({
          to: lead.email,
          subject: "Proposal accepted — thank you!",
          html: `<p>Hi ${lead.contact_name ?? "there"},</p><p>Thank you for accepting the proposal <strong>${row.title}</strong>. The Pjozz team will be in touch shortly with an invoice and kickoff next steps.</p><p style="color:#666;font-size:12px">— Pjozz Technologies</p>`,
        });
      } catch {
        /* optional */
      }
    }

    const notify = opsEmail();
    if (notify) {
      try {
        await sendTransactionalEmail({
          to: notify,
          subject: `Proposal accepted: ${row.title}`,
          html: `<p>Proposal <strong>${row.title}</strong> (${id}) was accepted.</p>${
            lead ? `<p>Lead: ${lead.company_name} — ${lead.email}</p>` : ""
          }${invoiceId ? `<p>Draft invoice created: <code>${invoiceId}</code></p>` : ""}${
            invoiceError ? `<p style="color:#b00">Invoice error: ${invoiceError}</p>` : ""
          }`,
        });
      } catch {
        /* optional */
      }
    }

    return NextResponse.json({
      ok: true as const,
      data: { invoiceId, clientId, invoiceError },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server error";
    const status = msg.includes("is not set") ? 503 : 500;
    return NextResponse.json({ ok: false as const, error: msg }, { status });
  }
}
