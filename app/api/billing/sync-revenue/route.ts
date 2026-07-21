import { NextResponse } from "next/server";

import { backfillPaidInvoiceReceipts } from "@/lib/billing/receipts";
import { publicApiError } from "@/lib/api-error";

export const dynamic = "force-dynamic";

/** Sync receipts + client.total_revenue for all paid invoices. */
export async function POST() {
  try {
    const result = await backfillPaidInvoiceReceipts();
    return NextResponse.json({ ok: true as const, data: result });
  } catch (e) {
    return NextResponse.json({ ok: false as const, error: publicApiError(e) }, { status: 500 });
  }
}
