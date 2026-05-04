import { NextResponse } from "next/server";
import { z } from "zod";

import type { TablesUpdate } from "@/lib/db/database.types";
import { createServerSupabaseClient } from "@/lib/db/supabase";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  status: z.enum(["active", "completed", "cancelled"]).optional(),
  items: z
    .array(
      z.object({
        id: z.string().uuid(),
        status: z.enum(["due", "paid", "void"]).optional(),
        paidAt: z.string().datetime().nullable().optional(),
      })
    )
    .optional(),
});

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from("payment_plans")
      .select("*, payment_plan_items ( * )")
      .eq("id", id)
      .maybeSingle();
    if (error) throw new Error(error.message);
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

    if (parsed.data.status) {
      const { error } = await supabase.from("payment_plans").update({ status: parsed.data.status }).eq("id", id);
      if (error) throw new Error(error.message);
    }

    if (parsed.data.items?.length) {
      for (const it of parsed.data.items) {
        const patch: TablesUpdate<"payment_plan_items"> = {};
        if (it.status) patch.status = it.status;
        if ("paidAt" in it) patch.paid_at = it.paidAt ?? null;
        const { error } = await supabase.from("payment_plan_items").update(patch).eq("id", it.id).eq("plan_id", id);
        if (error) throw new Error(error.message);
      }
    }

    const { data, error } = await supabase
      .from("payment_plans")
      .select("*, payment_plan_items ( * )")
      .eq("id", id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true as const, data });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ ok: false as const, error: msg }, { status: 500 });
  }
}

