import { NextResponse } from "next/server";
import { z } from "zod";

import type { TablesInsert } from "@/lib/db/database.types";
import { createServerSupabaseClient } from "@/lib/db/supabase";
import { getSetting } from "@/lib/settings/store";

export const dynamic = "force-dynamic";

const listQuerySchema = z.object({
  clientId: z.string().uuid().optional(),
  status: z.enum(["draft", "sent", "paid", "overdue", "void"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

function nextInvoiceNumber(prefix = "INV"): string {
  // Simple, collision-resistant-enough for single-user local/dev.
  // For multi-user prod, switch to a DB sequence per org.
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const rnd = Math.random().toString(36).slice(2, 6).toUpperCase();
  const safe = prefix.trim().replace(/[^A-Za-z0-9_-]/g, "") || "INV";
  return `${safe}-${y}${m}${day}-${rnd}`;
}

const createSchema = z.object({
  clientId: z.string().uuid(),
  leadId: z.string().uuid().optional().nullable(),
  proposalId: z.string().uuid().optional().nullable(),
  currency: z.string().min(3).max(8).optional(),
  dueAt: z.string().datetime().optional().nullable(),
  notes: z.string().max(5000).optional().nullable(),
  items: z
    .array(
      z.object({
        description: z.string().min(1).max(400),
        quantity: z.coerce.number().positive().optional().default(1),
        unitPrice: z.coerce.number().min(0).optional().default(0),
      })
    )
    .min(1),
  vatRate: z.coerce.number().min(0).max(1).optional(),
});

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const parsed = listQuerySchema.safeParse(Object.fromEntries(url.searchParams.entries()));
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false as const, error: "Invalid query", issues: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const { clientId, status, page, pageSize } = parsed.data;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const supabase = createServerSupabaseClient();
    let q = supabase
      .from("invoices")
      .select("*, clients ( company_name, email )", { count: "exact" })
      .order("created_at", { ascending: false });
    if (clientId) q = q.eq("client_id", clientId);
    if (status) q = q.eq("status", status);
    const { data, error, count } = await q.range(from, to);
    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true as const, data: { invoices: data ?? [], total: count ?? 0, page, pageSize } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ ok: false as const, error: msg }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const json: unknown = await req.json();
    const parsed = createSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false as const, error: "Invalid body", issues: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const supabase = createServerSupabaseClient();

    const billingDefaults = await getSetting("billing.defaults");
    const vatRate = parsed.data.vatRate ?? billingDefaults.vatRate ?? 0.15;
    const currency = parsed.data.currency ?? billingDefaults.currency ?? "ZAR";

    const items = parsed.data.items.map((it, idx) => ({
      description: it.description,
      quantity: Number(it.quantity),
      unit_price: Number(it.unitPrice),
      amount: Math.round(Number(it.quantity) * Number(it.unitPrice) * 100) / 100,
      sort_order: idx,
    }));
    const subtotal = items.reduce((s, it) => s + (Number(it.amount) || 0), 0);
    const vat = Math.round(subtotal * vatRate * 100) / 100;
    const total = Math.round((subtotal + vat) * 100) / 100;

    const invoiceNumber = nextInvoiceNumber(billingDefaults.invoicePrefix);
    const invoiceInsert: TablesInsert<"invoices"> = {
      client_id: parsed.data.clientId,
      lead_id: parsed.data.leadId ?? null,
      proposal_id: parsed.data.proposalId ?? null,
      invoice_number: invoiceNumber,
      status: "draft",
      currency,
      issued_at: null,
      due_at: parsed.data.dueAt ?? null,
      subtotal,
      vat,
      total,
      notes: parsed.data.notes ?? null,
    };

    const { data: invoice, error: invErr } = await supabase.from("invoices").insert(invoiceInsert).select("*").single();
    if (invErr) throw new Error(invErr.message);

    const { error: itemsErr } = await supabase.from("invoice_items").insert(
      items.map((it) => ({ ...it, invoice_id: invoice.id }))
    );
    if (itemsErr) throw new Error(itemsErr.message);

    return NextResponse.json({ ok: true as const, data: { invoice } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ ok: false as const, error: msg }, { status: 500 });
  }
}

