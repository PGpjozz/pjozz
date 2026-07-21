import { NextResponse } from "next/server";

import { ensureClientAndInvoiceFromProposal } from "@/lib/billing/invoice-from-proposal";
import { createServerSupabaseClient } from "@/lib/db/supabase";

export const dynamic = "force-dynamic";

/** POST — create (or return existing) draft invoice from a sent/accepted proposal. */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = createServerSupabaseClient();
    const { data: proposal, error } = await supabase
      .from("proposals")
      .select("id, status")
      .eq("id", id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!proposal) return NextResponse.json({ ok: false as const, error: "Proposal not found" }, { status: 404 });

    if (proposal.status !== "sent" && proposal.status !== "accepted") {
      return NextResponse.json(
        {
          ok: false as const,
          error: "Send or accept the proposal before creating an invoice.",
        },
        { status: 400 }
      );
    }

    const result = await ensureClientAndInvoiceFromProposal(id);
    return NextResponse.json({
      ok: true as const,
      data: {
        clientId: result.clientId,
        invoiceId: result.invoiceId,
        alreadyHadInvoice: result.alreadyHadInvoice,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server error";
    const status = msg.includes("is not set") ? 503 : msg.includes("not found") ? 404 : 500;
    return NextResponse.json({ ok: false as const, error: msg }, { status });
  }
}
