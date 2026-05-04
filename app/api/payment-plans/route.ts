import { NextResponse } from "next/server";
import { z } from "zod";

import type { TablesInsert } from "@/lib/db/database.types";
import { createServerSupabaseClient } from "@/lib/db/supabase";

export const dynamic = "force-dynamic";

const listQuerySchema = z.object({
  clientId: z.string().uuid().optional(),
  invoiceId: z.string().uuid().optional(),
});

const createSchema = z.object({
  clientId: z.string().uuid(),
  invoiceId: z.string().uuid().optional().nullable(),
  name: z.string().min(1).max(200),
  items: z
    .array(
      z.object({
        label: z.string().min(1).max(200),
        dueAt: z.string().datetime().optional().nullable(),
        amount: z.coerce.number().min(0).optional().default(0),
      })
    )
    .min(1),
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
    const supabase = createServerSupabaseClient();
    let q = supabase
      .from("payment_plans")
      .select("*, payment_plan_items ( * )")
      .order("created_at", { ascending: false });
    if (parsed.data.clientId) q = q.eq("client_id", parsed.data.clientId);
    if (parsed.data.invoiceId) q = q.eq("invoice_id", parsed.data.invoiceId);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true as const, data: data ?? [] });
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

    const planInsert: TablesInsert<"payment_plans"> = {
      client_id: parsed.data.clientId,
      invoice_id: parsed.data.invoiceId ?? null,
      name: parsed.data.name,
      status: "active",
    };

    const { data: plan, error: pErr } = await supabase.from("payment_plans").insert(planInsert).select("*").single();
    if (pErr) throw new Error(pErr.message);

    const itemsInsert = parsed.data.items.map((it, idx): TablesInsert<"payment_plan_items"> => ({
      plan_id: plan.id,
      label: it.label,
      due_at: it.dueAt ?? null,
      amount: Number(it.amount),
      status: "due",
      paid_at: null,
      sort_order: idx,
    }));

    const { error: iErr } = await supabase.from("payment_plan_items").insert(itemsInsert);
    if (iErr) throw new Error(iErr.message);

    return NextResponse.json({ ok: true as const, data: { planId: plan.id } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ ok: false as const, error: msg }, { status: 500 });
  }
}

