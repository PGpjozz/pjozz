import { NextResponse } from "next/server";
import { z } from "zod";

import { ensureReceiptForPaidInvoice } from "@/lib/billing/receipts";
import { computeInvoiceTotals } from "@/lib/billing/numbers";
import type { TablesUpdate } from "@/lib/db/database.types";
import { createServerSupabaseClient } from "@/lib/db/supabase";
import { getSetting } from "@/lib/settings/store";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  status: z.enum(["draft", "sent", "paid", "overdue", "void"]).optional(),
  issuedAt: z.string().datetime().nullable().optional(),
  dueAt: z.string().datetime().nullable().optional(),
  notes: z.string().max(5000).nullable().optional(),
  paymentMethod: z.string().max(80).optional(),
  items: z
    .array(
      z.object({
        description: z.string().min(1).max(400),
        quantity: z.coerce.number().positive(),
        unitPrice: z.coerce.number().min(0),
      })
    )
    .min(1)
    .optional(),
});

async function loadInvoiceDetail(id: string) {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("invoices")
    .select("*, clients ( company_name, email ), invoice_items ( * ), receipts ( id, receipt_number )")
    .eq("id", id)
    .maybeSingle();
  if (error) {
    // receipts join may fail if migration not applied — fall back.
    if (error.message.toLowerCase().includes("receipts")) {
      const fallback = await supabase
        .from("invoices")
        .select("*, clients ( company_name, email ), invoice_items ( * )")
        .eq("id", id)
        .maybeSingle();
      if (fallback.error) throw new Error(fallback.error.message);
      return fallback.data;
    }
    throw new Error(error.message);
  }
  return data;
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const data = await loadInvoiceDetail(id);
    if (!data) return NextResponse.json({ ok: false as const, error: "Not found" }, { status: 404 });
    return NextResponse.json({ ok: true as const, data });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ ok: false as const, error: msg }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const json: unknown = await req.json();
    const parsed = patchSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false as const, error: "Invalid body", issues: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const supabase = createServerSupabaseClient();
    const patch: TablesUpdate<"invoices"> = {};
    if (parsed.data.status) {
      patch.status = parsed.data.status;
      if (parsed.data.status === "sent" || parsed.data.status === "paid") {
        patch.issued_at = new Date().toISOString();
      }
    }
    if ("issuedAt" in parsed.data) patch.issued_at = parsed.data.issuedAt ?? null;
    if ("dueAt" in parsed.data) patch.due_at = parsed.data.dueAt ?? null;
    if ("notes" in parsed.data) patch.notes = parsed.data.notes ?? null;

    if (parsed.data.items) {
      const billingDefaults = await getSetting("billing.defaults");
      const vatRate = billingDefaults.vatRate ?? 0.15;
      const { lines, subtotal, vat, total } = computeInvoiceTotals(
        parsed.data.items.map((it) => ({
          description: it.description,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
        })),
        vatRate
      );
      patch.subtotal = subtotal;
      patch.vat = vat;
      patch.total = total;

      const { error: delErr } = await supabase.from("invoice_items").delete().eq("invoice_id", id);
      if (delErr) throw new Error(delErr.message);
      const { error: insErr } = await supabase.from("invoice_items").insert(
        lines.map((it) => ({ ...it, invoice_id: id }))
      );
      if (insErr) throw new Error(insErr.message);
    }

    const { data: updated, error } = await supabase.from("invoices").update(patch).eq("id", id).select("*").single();
    if (error) throw new Error(error.message);

    let receiptId: string | null = null;
    let receiptError: string | null = null;
    if (parsed.data.status === "paid") {
      try {
        const receipt = await ensureReceiptForPaidInvoice(updated, {
          paymentMethod: parsed.data.paymentMethod ?? "eft",
        });
        receiptId = receipt.id;
      } catch (rErr) {
        receiptError = rErr instanceof Error ? rErr.message : "Receipt create failed";
        console.warn("[invoices PATCH] receipt create:", rErr);
      }
    }

    const detail = await loadInvoiceDetail(id);
    return NextResponse.json({
      ok: true as const,
      data: detail ?? updated,
      receiptId,
      receiptError,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ ok: false as const, error: msg }, { status: 500 });
  }
}
