import type { Tables } from "@/lib/db/database.types";
import { createServerSupabaseClient } from "@/lib/db/supabase";

import { nextDocumentNumber } from "./numbers";

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
  if (existing) return existing;

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

  // Bump client revenue when payment clears.
  if (invoice.client_id) {
    const { data: client } = await supabase
      .from("clients")
      .select("id, total_revenue")
      .eq("id", invoice.client_id)
      .maybeSingle();
    if (client) {
      const next = Math.round((Number(client.total_revenue) || 0) + (Number(invoice.total) || 0) * 100) / 100;
      await supabase.from("clients").update({ total_revenue: next }).eq("id", client.id);
    }
  }

  return receipt;
}
