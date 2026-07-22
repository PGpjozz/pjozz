import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { NextResponse } from "next/server";

import { QuotePdfDocument } from "@/lib/billing/quote-pdf-document";
import { createServerSupabaseClient } from "@/lib/db/supabase";
import { assertProposalPdfAccess } from "@/lib/proposals/pdf-access";
import { rowToProposalDocument } from "@/lib/proposals/document";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET — commercial quotation PDF (pricing-focused) from a proposal. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const token = new URL(req.url).searchParams.get("token");
    const supabase = createServerSupabaseClient();
    const { data: row, error } = await supabase
      .from("proposals")
      .select("*, leads ( company_name )")
      .eq("id", id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) return NextResponse.json({ ok: false as const, error: "Not found" }, { status: 404 });

    const access = await assertProposalPdfAccess({
      shareToken: row.share_token,
      requestToken: token,
    });
    if (!access.ok) {
      return NextResponse.json({ ok: false as const, error: access.error }, { status: access.status });
    }
    if (row.status === "draft" && token) {
      return NextResponse.json({ ok: false as const, error: "Not found" }, { status: 404 });
    }

    const doc = rowToProposalDocument(row);
    if (!doc) return NextResponse.json({ ok: false as const, error: "No proposal document" }, { status: 400 });

    const lead = Array.isArray(row.leads) ? row.leads[0] : row.leads;
    const buffer = await renderToBuffer(
      React.createElement(QuotePdfDocument, {
        content: doc,
        companyName: lead?.company_name ?? null,
      }) as Parameters<typeof renderToBuffer>[0]
    );

    const safeName = `quote-${(row.title || "pjozz").replace(/[^\w\s-]/g, "").slice(0, 40)}`;
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${safeName}.pdf"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ ok: false as const, error: msg }, { status: 500 });
  }
}
