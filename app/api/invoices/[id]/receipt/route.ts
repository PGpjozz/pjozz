import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { NextResponse } from "next/server";

import { ReceiptPdfDocument } from "@/lib/billing/receipt-pdf-document";
import { ensureReceiptForPaidInvoice } from "@/lib/billing/receipts";
import { createServerSupabaseClient } from "@/lib/db/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = createServerSupabaseClient();
    const { data: invoice, error } = await supabase
      .from("invoices")
      .select("*, clients ( company_name, email )")
      .eq("id", id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!invoice) return NextResponse.json({ ok: false as const, error: "Invoice not found" }, { status: 404 });
    if (invoice.status !== "paid") {
      return NextResponse.json(
        { ok: false as const, error: "Receipt is only available after the invoice is marked paid." },
        { status: 400 }
      );
    }

    const receipt = await ensureReceiptForPaidInvoice(invoice);
    const client = Array.isArray(invoice.clients) ? invoice.clients[0] : invoice.clients;

    const buffer = await renderToBuffer(
      React.createElement(ReceiptPdfDocument, {
        data: {
          receiptNumber: receipt.receipt_number,
          invoiceNumber: invoice.invoice_number,
          companyName: client?.company_name ?? "Client",
          companyEmail: client?.email ?? null,
          amount: Number(receipt.amount),
          currency: receipt.currency,
          paidAt: receipt.paid_at,
          paymentMethod: receipt.payment_method,
          notes: receipt.notes,
        },
      }) as Parameters<typeof renderToBuffer>[0]
    );

    const safeName = receipt.receipt_number.replace(/[^\w-]/g, "_");
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${safeName}.pdf"`,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server error";
    const status = msg.includes("does not exist") || msg.includes("receipts") ? 503 : 500;
    return NextResponse.json(
      {
        ok: false as const,
        error:
          status === 503
            ? "Receipts table missing — run lib/db/migrations/003_add_receipts.sql in Supabase."
            : msg,
      },
      { status }
    );
  }
}
