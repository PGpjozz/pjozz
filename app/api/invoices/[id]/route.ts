import { NextResponse } from "next/server";
import { z } from "zod";

import type { TablesUpdate } from "@/lib/db/database.types";
import { createServerSupabaseClient } from "@/lib/db/supabase";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  status: z.enum(["draft", "sent", "paid", "overdue", "void"]).optional(),
  issuedAt: z.string().datetime().nullable().optional(),
  dueAt: z.string().datetime().nullable().optional(),
  notes: z.string().max(5000).nullable().optional(),
});

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
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
    if (parsed.data.status) patch.status = parsed.data.status;
    if ("issuedAt" in parsed.data) patch.issued_at = parsed.data.issuedAt ?? null;
    if ("dueAt" in parsed.data) patch.due_at = parsed.data.dueAt ?? null;
    if ("notes" in parsed.data) patch.notes = parsed.data.notes ?? null;

    const { data, error } = await supabase
      .from("invoices")
      .update(patch)
      .eq("id", id)
      .select("*, clients ( company_name, email ), invoice_items ( * )")
      .single();
    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true as const, data });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ ok: false as const, error: msg }, { status: 500 });
  }
}

