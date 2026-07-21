import { generateProposal } from "@/lib/ai/proposal-generator";
import { toAppLead } from "@/lib/ai/schemas";
import { createServerSupabaseClient } from "@/lib/db/supabase";
import { discoveryWizardSchema } from "@/lib/proposals/discovery";
import { leadRowToApiLeadForAi } from "@/lib/proposals/ai-lead";
import { allPricingTemplatesSummary, pricingHintForServiceType } from "@/lib/proposals/pricing-templates";
import { proposalContentToRowPatch } from "@/lib/proposals/document";
import { PROPOSAL_STREAM_KEYS, SECTION_LABELS, sleep } from "@/lib/proposals/stream-sections";
import { getSetting } from "@/lib/settings/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
      };
      try {
        const flags = await getSetting("features.flags");
        if (flags.enableAi === false) throw new Error("AI is disabled in settings.");

        const proposalDefaults = await getSetting("proposals.defaults");
        const supabase = createServerSupabaseClient();
        const { data: proposal, error: pErr } = await supabase.from("proposals").select("*").eq("id", id).maybeSingle();
        if (pErr) throw new Error(pErr.message);
        if (!proposal?.lead_id) throw new Error("Proposal needs a lead");
        const discParsed = discoveryWizardSchema.safeParse(proposal.discovery_json);
        if (!discParsed.success) throw new Error("Save discovery (step 2) before generating");
        const d = discParsed.data;

        const { data: leadRow, error: lErr } = await supabase.from("leads").select("*").eq("id", proposal.lead_id).single();
        if (lErr || !leadRow) throw new Error("Lead not found");

        const apiLead = leadRowToApiLeadForAi(leadRow);
        const lead = toAppLead(apiLead);
        const pricingReference = [pricingHintForServiceType(d.serviceType), "", "Reference tiers:", allPricingTemplatesSummary()].join(
          "\n"
        );

        send({ type: "start", labels: SECTION_LABELS });

        const content = await generateProposal(lead, d.discoveryNotes, d.serviceType, {
          budgetRange: d.budgetRange,
          timelinePreference: d.timelinePreference,
          specialRequirements: d.specialRequirements,
          pricingReference,
          currency: proposalDefaults.currency ?? (proposal.currency ?? "ZAR"),
        });

        for (const key of PROPOSAL_STREAM_KEYS) {
          await sleep(260);
          send({ type: "section", key, label: SECTION_LABELS[key] ?? key, data: content[key] });
        }

        await supabase.from("proposals").update(proposalContentToRowPatch(content)).eq("id", id);

        send({ type: "done", content });
      } catch (e) {
        send({ type: "error", message: e instanceof Error ? e.message : "Failed" });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
