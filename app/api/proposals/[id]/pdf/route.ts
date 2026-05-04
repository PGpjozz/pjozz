import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { NextResponse } from "next/server";

import { createServerSupabaseClient } from "@/lib/db/supabase";
import { rowToProposalDocument } from "@/lib/proposals/document";
import { ProposalPdfDocument } from "@/lib/proposals/proposal-pdf-document";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = createServerSupabaseClient();
    const { data: row, error } = await supabase.from("proposals").select("*").eq("id", id).maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) return NextResponse.json({ ok: false as const, error: "Not found" }, { status: 404 });
    const doc = rowToProposalDocument(row);
    if (!doc) return NextResponse.json({ ok: false as const, error: "No document" }, { status: 400 });

    const buffer = await renderToBuffer(
      React.createElement(ProposalPdfDocument, { content: doc }) as Parameters<typeof renderToBuffer>[0]
    );
    const safeName = row.title.replace(/[^\w\s-]/g, "").slice(0, 60) || "proposal";

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${safeName}.pdf"`,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ ok: false as const, error: msg }, { status: 500 });
  }
}
