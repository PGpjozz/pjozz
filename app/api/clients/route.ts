import { NextResponse } from "next/server";
import { z } from "zod";

import { createServerSupabaseClient } from "@/lib/db/supabase";

export const dynamic = "force-dynamic";

const listQuerySchema = z.object({
  q: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
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
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ ok: false as const, error: msg }, { status: 500 });
  }
}

