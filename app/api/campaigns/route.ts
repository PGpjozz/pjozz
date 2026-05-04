import { NextResponse } from "next/server";
import { z } from "zod";

import type { Json } from "@/lib/db/database.types";
import { createServerSupabaseClient } from "@/lib/db/supabase";
import { defaultCampaignSettings, newStep } from "@/lib/campaigns/defaults";
import { loadCampaignChartSeries } from "@/lib/campaigns/chart-data";
import { campaignRowToApi } from "@/lib/campaigns/serialize";
import { parseCampaignSettings, parseSequence } from "@/lib/campaigns/parse";

export const dynamic = "force-dynamic";

const campaignType = z.enum(["email", "whatsapp", "linkedin", "multichannel"]);

const postSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional().nullable(),
  type: campaignType.optional(),
  sequence: z.array(z.unknown()).optional(),
  settings: z.record(z.string(), z.unknown()).optional(),
  status: z.enum(["draft", "active"]).optional(),
});

export async function GET() {
  try {
    const supabase = createServerSupabaseClient();
    const { data: rows, error } = await supabase.from("campaigns").select("*").order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    const chart = await loadCampaignChartSeries(8);
    return NextResponse.json({
      ok: true as const,
      data: {
        campaigns: (rows ?? []).map(campaignRowToApi),
        chart,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server error";
    const status = msg.includes("is not set") ? 503 : 500;
    return NextResponse.json({ ok: false as const, error: msg }, { status });
  }
}

export async function POST(req: Request) {
  try {
    const json: unknown = await req.json();
    const parsed = postSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false as const, error: "Invalid body", issues: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const p = parsed.data;
    const sequence = p.sequence?.length ? parseSequence(p.sequence) : [newStep({ delayKind: "immediate", delayDays: 0 })];
    const mergedSettings = { ...defaultCampaignSettings(), ...(p.settings ?? {}) };
    const settings = parseCampaignSettings(mergedSettings as unknown as Json);

    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from("campaigns")
      .insert({
        name: p.name,
        description: p.description ?? null,
        type: p.type ?? "email",
        sequence: sequence as unknown as Json,
        settings: settings as unknown as Json,
        status: p.status ?? "draft",
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true as const, data: campaignRowToApi(data) });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server error";
    const status = msg.includes("is not set") ? 503 : 500;
    return NextResponse.json({ ok: false as const, error: msg }, { status });
  }
}
