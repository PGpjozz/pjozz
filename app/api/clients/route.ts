import { NextResponse } from "next/server";
import { z } from "zod";

import { publicApiError } from "@/lib/api-error";
import { createServerSupabaseClient } from "@/lib/db/supabase";

export const dynamic = "force-dynamic";

const listQuerySchema = z.object({
  q: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

const createBodySchema = z.object({
  companyName: z.string().min(1).max(200),
  contactName: z.string().max(200).optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().max(40).optional(),
  retainerActive: z.boolean().optional(),
  retainerAmount: z.number().min(0).optional(),
  leadId: z.string().uuid().optional().nullable(),
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
    const { q, page, pageSize } = parsed.data;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const supabase = createServerSupabaseClient();
    let query = supabase.from("clients").select("*", { count: "exact" }).order("created_at", { ascending: false });
    if (q?.trim()) {
      const like = `%${q.trim()}%`;
      query = query.or(`company_name.ilike.${like},email.ilike.${like},contact_name.ilike.${like}`);
    }
    const { data, error, count } = await query.range(from, to);
    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true as const, data: { clients: data ?? [], total: count ?? 0, page, pageSize } });
  } catch (e) {
    return NextResponse.json({ ok: false as const, error: publicApiError(e) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    let json: unknown;
    try {
      json = await req.json();
    } catch {
      return NextResponse.json({ ok: false as const, error: "Invalid JSON" }, { status: 400 });
    }

    const parsed = createBodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false as const, error: "Invalid body", issues: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const p = parsed.data;
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from("clients")
      .insert({
        company_name: p.companyName.trim(),
        contact_name: p.contactName?.trim() || null,
        email: p.email?.trim() || null,
        phone: p.phone?.trim() || null,
        retainer_active: p.retainerActive ?? false,
        retainer_amount: p.retainerAmount ?? null,
        lead_id: p.leadId ?? null,
        total_revenue: 0,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true as const, data: { client: data } }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ ok: false as const, error: publicApiError(e) }, { status: 500 });
  }
}
