import { NextResponse } from "next/server";
import { z } from "zod";

import type { Json, TablesUpdate } from "@/lib/db/database.types";
import { createServerSupabaseClient } from "@/lib/db/supabase";
import { campaignRowToApi } from "@/lib/campaigns/serialize";
import { parseCampaignSettings, parseSequence } from "@/lib/campaigns/parse";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional().nullable(),
  type: z.enum(["email", "whatsapp", "linkedin", "multichannel"]).optional(),
  sequence: z.array(z.unknown()).optional(),
  settings: z.record(z.string(), z.unknown()).optional(),
  status: z.enum(["draft", "active", "paused", "completed"]).optional(),
});

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = createServerSupabaseClient();
    const { data: row, error } = await supabase.from("campaigns").select("*").eq("id", id).maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) return NextResponse.json({ ok: false as const, error: "Not found" }, { status: 404 });

    const { data: enrollments, error: e2 } = await supabase
      .from("campaign_enrollments")
      .select(
        `
        *,
        leads ( id, company_name, contact_name, email )
      `
      )
      .eq("campaign_id", id)
      .order("created_at", { ascending: false });
    if (e2) throw new Error(e2.message);

    const { data: recentEvents, error: e3 } = await supabase
      .from("outreach_events")
      .select("lead_id, type, created_at")
      .eq("campaign_id", id)
      .order("created_at", { ascending: false })
      .limit(800);
    if (e3) throw new Error(e3.message);

    const lastByLead = new Map<string, { type: string; created_at: string }>();
    for (const ev of recentEvents ?? []) {
      if (!ev.lead_id) continue;
      if (!lastByLead.has(ev.lead_id)) lastByLead.set(ev.lead_id, { type: ev.type, created_at: ev.created_at });
    }

    const enriched = (enrollments ?? []).map((e) => {
      const leadId = e.lead_id as string;
      const last = lastByLead.get(leadId) ?? null;
      return { ...e, last_event: last };
    });

    return NextResponse.json({
      ok: true as const,
      data: {
        campaign: campaignRowToApi(row),
        enrollments: enriched,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server error";
    const status = msg.includes("is not set") ? 503 : 500;
    return NextResponse.json({ ok: false as const, error: msg }, { status });
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
    const p = parsed.data;
    const update: Record<string, unknown> = {};
    if (p.name !== undefined) update.name = p.name;
    if (p.description !== undefined) update.description = p.description;
    if (p.type !== undefined) update.type = p.type;
    if (p.sequence !== undefined) update.sequence = parseSequence(p.sequence) as unknown as Json;
    if (p.settings !== undefined) {
      const supabase = createServerSupabaseClient();
      const { data: existing } = await supabase.from("campaigns").select("settings").eq("id", id).maybeSingle();
      const base = parseCampaignSettings(existing?.settings ?? null);
      const merged = {
        ...base,
        ...(p.settings as Record<string, unknown>),
        sendWindow: p.settings.sendWindow
          ? { ...base.sendWindow, ...(p.settings.sendWindow as object) }
          : base.sendWindow,
      };
      update.settings = merged as unknown as Json;
    }
    if (p.status !== undefined) update.status = p.status;

    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from("campaigns")
      .update(update as TablesUpdate<"campaigns">)
      .eq("id", id)
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

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = createServerSupabaseClient();
    const { error } = await supabase.from("campaigns").delete().eq("id", id);
    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true as const });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server error";
    const status = msg.includes("is not set") ? 503 : 500;
    return NextResponse.json({ ok: false as const, error: msg }, { status });
  }
}
