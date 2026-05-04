import { NextResponse } from "next/server";
import { z } from "zod";

import type { Json, TablesUpdate } from "@/lib/db/database.types";
import { createServerSupabaseClient } from "@/lib/db/supabase";
import { mapLeadRow } from "@/lib/leads/mappers";
import { fetchLatestOutreachByLeadIds } from "@/lib/leads/api-query";
import { proposalContentOutputSchema } from "@/lib/ai/schemas";
import { discoveryWizardSchema } from "@/lib/proposals/discovery";
import { proposalContentToRowPatch, rowToProposalDocument } from "@/lib/proposals/document";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  discoveryJson: discoveryWizardSchema.optional(),
  document: proposalContentOutputSchema.optional(),
  title: z.string().min(1).optional(),
  status: z.enum(["draft", "sent", "accepted", "rejected", "expired"]).optional(),
});

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = createServerSupabaseClient();
    const { data: row, error } = await supabase.from("proposals").select("*").eq("id", id).maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) return NextResponse.json({ ok: false as const, error: "Not found" }, { status: 404 });
    if (!row.lead_id) {
      return NextResponse.json({
        ok: true as const,
        data: { proposal: row, lead: null, document: rowToProposalDocument(row) },
      });
    }
    const { data: lead, error: lErr } = await supabase.from("leads").select("*").eq("id", row.lead_id).maybeSingle();
    if (lErr) throw new Error(lErr.message);
    const outreach = lead ? await fetchLatestOutreachByLeadIds(supabase, [lead.id]) : new Map();
    const ev = lead ? outreach.get(lead.id) : undefined;
    const last = lead && ev && ev > lead.updated_at ? ev : lead?.updated_at;
    return NextResponse.json({
      ok: true as const,
      data: {
        proposal: row,
        lead: lead ? mapLeadRow(lead, last) : null,
        document: rowToProposalDocument(row),
        discovery: row.discovery_json,
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
    const update: TablesUpdate<"proposals"> = {};
    if (p.discoveryJson) update.discovery_json = p.discoveryJson as unknown as Json;
    if (p.document) Object.assign(update, proposalContentToRowPatch(p.document));
    if (p.title !== undefined) update.title = p.title;
    if (p.status !== undefined) update.status = p.status;

    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase.from("proposals").update(update).eq("id", id).select("*").single();
    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true as const, data });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server error";
    const status = msg.includes("is not set") ? 503 : 500;
    return NextResponse.json({ ok: false as const, error: msg }, { status });
  }
}
