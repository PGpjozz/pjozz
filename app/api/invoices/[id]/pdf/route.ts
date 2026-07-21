import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { NextResponse } from "next/server";

import { InvoicePdfDocument } from "@/lib/billing/invoice-pdf-document";
import { createServerSupabaseClient } from "@/lib/db/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from("invoices")
      .select("*, clients ( company_name, email ), invoice_items ( * )")
      .eq("id", id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return NextResponse.json({ ok: false as const, error: "Not found" }, { status: 404 });

    const client = Array.isArray(data.clients) ? data.clients[0] : data.clients;
    const items = (data.invoice_items ?? [])
      .slice()
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .map((it) => ({
        description: it.description,
        quantity: Number(it.quantity),
        unitPrice: Number(it.unit_price),
        amount: Number(it.amount),
      }));

    const buffer = await renderToBuffer(
      React.createElement(InvoicePdfDocument, {
        data: {
          invoiceNumber: data.invoice_number,
          status: data.status,
          currency: data.currency,
          issuedAt: data.issued_at,
          dueAt: data.due_at,
          companyName: client?.company_name ?? "Client",
          companyEmail: client?.email ?? null,
          notes: data.notes,
          subtotal: Number(data.subtotal),
          vat: Number(data.vat),
          total: Number(data.total),
          items,
        },
      }) as Parameters<typeof renderToBuffer>[0]
    );

    const safeName = data.invoice_number.replace(/[^\w-]/g, "_");
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
