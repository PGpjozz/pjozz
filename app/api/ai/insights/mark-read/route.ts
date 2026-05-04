import { NextResponse } from "next/server";
import { z } from "zod";

import { createServerSupabaseClient } from "@/lib/db/supabase";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  all: z.boolean().optional(),
  id: z.string().uuid().optional(),
});

export async function POST(req: Request) {
  try {
    const json: unknown = await req.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false as const, error: "Invalid body", issues: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();

    if (parsed.data.all) {
      const { error } = await supabase.from("ai_insights").update({ is_read: true }).eq("is_read", false);
      if (error) throw new Error(error.message);
      return NextResponse.json({ ok: true as const });
    }

    if (parsed.data.id) {
      const { error } = await supabase.from("ai_insights").update({ is_read: true }).eq("id", parsed.data.id);
      if (error) throw new Error(error.message);
      return NextResponse.json({ ok: true as const });
    }

    return NextResponse.json({ ok: false as const, error: "Provide all: true or id" }, { status: 400 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ ok: false as const, error: msg }, { status: 500 });
  }
}
