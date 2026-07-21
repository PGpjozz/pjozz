import { NextResponse } from "next/server";
import { z } from "zod";

import type { Json } from "@/lib/db/database.types";
import { createServerSupabaseClient } from "@/lib/db/supabase";
import { getSetting } from "@/lib/settings/store";
import { mapLeadRow } from "@/lib/leads/mappers";
import { fetchLatestOutreachByLeadIds } from "@/lib/leads/api-query";
import { rowToProposalDocument } from "@/lib/proposals/document";
import type { ProposalContent } from "@/lib/ai/types";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  leadId: z.string().uuid(),
});

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const leadId = url.searchParams.get("leadId");
    const supabase = createServerSupabaseClient();
    let q = supabase
      .from("proposals")
      .select(`*, leads ( id, company_name, contact_name, email )`)
      .order("created_at", { ascending: false });
    if (leadId) q = q.eq("lead_id", leadId);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);

    const proposals = rows ?? [];
    const sent = proposals.filter((p) => p.status !== "draft").length;
    const accepted = proposals.filter((p) => p.status === "accepted").length;
    const rejected = proposals.filter((p) => p.status === "rejected").length;
    const closed = accepted + rejected;
    const acceptanceRate = closed > 0 ? Math.round((accepted / closed) * 1000) / 10 : null;
    const wonValue = proposals
      .filter((p) => p.status === "accepted")
      .reduce((s, p) => s + (p.total_value != null ? Number(p.total_value) : 0), 0);
    const avgDeal =
      accepted > 0
        ? proposals.filter((p) => p.status === "accepted" && p.total_value != null).reduce((s, p) => s + Number(p.total_value), 0) /
          accepted
        : null;

    return NextResponse.json({
      ok: true as const,
      data: {
        proposals,
        stats: {
          totalSent: sent,
          acceptanceRate,
          totalWonValueZar: Math.round(wonValue * 100) / 100,
          avgDealSizeZar: avgDeal != null ? Math.round(avgDeal * 100) / 100 : null,
        },
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
    const parsed = createSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false as const, error: "Invalid body", issues: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const supabase = createServerSupabaseClient();
    const proposalDefaults = await getSetting("proposals.defaults");
    const { data: lead, error: lErr } = await supabase.from("leads").select("*").eq("id", parsed.data.leadId).maybeSingle();
    if (lErr) throw new Error(lErr.message);
    if (!lead) return NextResponse.json({ ok: false as const, error: "Lead not found" }, { status: 404 });

    const sections = proposalDefaults.template?.sections ?? [];
    const sectionText = (key: string): string => {
      const row = sections.find((s) => s.key === key);
      if (!row || row.enabled === false) return "";
      return row.defaultText?.trim() ?? "";
    };

    const defaultDoc: ProposalContent = {
      title: proposalDefaults.defaultTitle ?? "Draft proposal",
      executiveSummary: sectionText("executiveSummary"),
      problemStatement: sectionText("problemStatement"),
      proposedSolution: sectionText("proposedSolution"),
      deliverables: [],
      timeline: [],
      investmentOptions: [],
      whyPjozz: sectionText("whyPjozz"),
      nextSteps: sectionText("nextSteps"),
    };

    const { data, error } = await supabase
      .from("proposals")
      .insert({
        lead_id: lead.id,
        title: proposalDefaults.defaultTitle ?? "Draft proposal",
        scope: null,
        deliverables: [] as unknown as Json,
        timeline: null,
        pricing: {} as unknown as Json,
        document_json: defaultDoc as unknown as Json,
        discovery_json: {} as unknown as Json,
        currency: proposalDefaults.currency ?? "ZAR",
        status: "draft",
        generated_by_ai: true,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);

    const outreach = await fetchLatestOutreachByLeadIds(supabase, [lead.id]);
    const ev = outreach.get(lead.id);
    const last = ev && ev > lead.updated_at ? ev : lead.updated_at;

    return NextResponse.json({
      ok: true as const,
      data: {
        proposal: data,
        lead: mapLeadRow(lead, last),
        document: rowToProposalDocument(data),
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server error";
    const status = msg.includes("is not set") ? 503 : 500;
    return NextResponse.json({ ok: false as const, error: msg }, { status });
  }
}
