import { NextResponse } from "next/server";
import { z } from "zod";

import { getPipelineForLead, upsertPipelineForLead } from "@/lib/db/supabase";

export const dynamic = "force-dynamic";

const putSchema = z.object({
  stage: z.string().min(1),
  probability: z.number().int().min(0).max(100),
  dealValue: z.number().nullable().optional(),
  expectedCloseDate: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const row = await getPipelineForLead(id);
    return NextResponse.json({ ok: true as const, data: row });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server error";
    const status = msg.includes("is not set") ? 503 : 500;
    return NextResponse.json({ ok: false as const, error: msg }, { status });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const json: unknown = await req.json();
    const parsed = putSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false as const, error: "Invalid body", issues: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const b = parsed.data;
    const row = await upsertPipelineForLead(id, {
      stage: b.stage,
      probability: b.probability,
      deal_value: b.dealValue ?? null,
      expected_close_date: b.expectedCloseDate ?? null,
      notes: b.notes ?? null,
    });
    return NextResponse.json({ ok: true as const, data: row });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server error";
    const status = msg.includes("is not set") ? 503 : 500;
    return NextResponse.json({ ok: false as const, error: msg }, { status });
  }
}
