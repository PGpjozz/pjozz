import type { Tables } from "@/lib/db/database.types";
import { createServerSupabaseClient } from "@/lib/db/supabase";

import { nextDocumentNumber, roundMoney } from "./numbers";

/** Recompute client.total_revenue from all paid invoices (source of truth). */
export async function syncClientRevenue(clientId: string): Promise<number> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("invoices")
    .select("total")
    .eq("client_id", clientId)
    .eq("status", "paid");
  if (error) throw new Error(error.message);

  const next = roundMoney((data ?? []).reduce((s, r) => s + (Number(r.total) || 0), 0));
  const { error: upErr } = await supabase.from("clients").update({ total_revenue: next }).eq("id", clientId);
  if (upErr) throw new Error(upErr.message);
  return next;
}

/** Create a receipt when an invoice is marked paid (idempotent per invoice). */
export async function ensureReceiptForPaidInvoice(
  invoice: Tables<"invoices">,
  opts?: { paymentMethod?: string | null; notes?: string | null }
): Promise<Tables<"receipts">> {
  const supabase = createServerSupabaseClient();

  const { data: existing } = await supabase
    .from("receipts")
    .select("*")
    .eq("invoice_id", invoice.id)
    .maybeSingle();

  if (!existing) {
    const { data: receipt, error } = await supabase
      .from("receipts")
      .insert({
        invoice_id: invoice.id,
        receipt_number: nextDocumentNumber("RCP"),
        amount: Number(invoice.total) || 0,
        currency: invoice.currency || "ZAR",
        paid_at: new Date().toISOString(),
        payment_method: opts?.paymentMethod ?? "eft",
        notes: opts?.notes ?? null,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);

    if (invoice.client_id) {
      await syncClientRevenue(invoice.client_id);
    }
    return receipt;
  }

  // Receipt already exists — still refresh client revenue (covers older paid invoices).
  if (invoice.client_id) {
    await syncClientRevenue(invoice.client_id);
  }
  return existing;
}

/** Ensure every paid invoice has a receipt and client revenue is synced. */
export async function backfillPaidInvoiceReceipts(): Promise<{
  receiptsCreated: number;
  clientsSynced: number;
}> {
  const supabase = createServerSupabaseClient();
  const { data: paid, error } = await supabase.from("invoices").select("*").eq("status", "paid");
  if (error) throw new Error(error.message);

  let receiptsCreated = 0;
  const clientIds = new Set<string>();

  for (const invoice of paid ?? []) {
    const { data: existing } = await supabase
      .from("receipts")
      .select("id")
      .eq("invoice_id", invoice.id)
      .maybeSingle();
    await ensureReceiptForPaidInvoice(invoice);
    if (!existing) receiptsCreated += 1;
    if (invoice.client_id) clientIds.add(invoice.client_id);
  }

  return { receiptsCreated, clientsSynced: clientIds.size };
}
