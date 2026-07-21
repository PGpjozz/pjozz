import type { ProposalContent } from "@/lib/ai/types";
import type { Tables } from "@/lib/db/database.types";
import { createServerSupabaseClient } from "@/lib/db/supabase";
import { rowToProposalDocument } from "@/lib/proposals/document";
import { getSetting } from "@/lib/settings/store";

import { computeInvoiceTotals, nextDocumentNumber, type LineItemInput } from "./numbers";

export function lineItemsFromProposal(
  proposal: Tables<"proposals">,
  doc: ProposalContent | null
): LineItemInput[] {
  const options = doc?.investmentOptions?.filter((o) => Number(o.price) > 0) ?? [];
  if (options.length > 0) {
    // Prefer the highest-priced tier as the default contracted option.
    const best = options.reduce((a, b) => (Number(b.price) > Number(a.price) ? b : a));
    return [
      {
        description: `${proposal.title} — ${best.tier}`,
        quantity: 1,
        unitPrice: Number(best.price),
      },
    ];
  }
  if (proposal.total_value != null && Number(proposal.total_value) > 0) {
    return [
      {
        description: proposal.title || "Project services",
        quantity: 1,
        unitPrice: Number(proposal.total_value),
      },
    ];
  }
  return [
    {
      description: proposal.title || "Project deposit / milestone",
      quantity: 1,
      unitPrice: 0,
    },
  ];
}

export async function createInvoiceForClient(opts: {
  clientId: string;
  leadId?: string | null;
  proposalId?: string | null;
  items: LineItemInput[];
  notes?: string | null;
  currency?: string;
  vatRate?: number;
  dueAt?: string | null;
  status?: "draft" | "sent";
}) {
  const supabase = createServerSupabaseClient();
  const billingDefaults = await getSetting("billing.defaults");
  const vatRate = opts.vatRate ?? billingDefaults.vatRate ?? 0.15;
  const currency = opts.currency ?? billingDefaults.currency ?? "ZAR";
  const { lines, subtotal, vat, total } = computeInvoiceTotals(opts.items, vatRate);

  const { data: invoice, error: invErr } = await supabase
    .from("invoices")
    .insert({
      client_id: opts.clientId,
      lead_id: opts.leadId ?? null,
      proposal_id: opts.proposalId ?? null,
      invoice_number: nextDocumentNumber(billingDefaults.invoicePrefix ?? "INV"),
      status: opts.status ?? "draft",
      currency,
      issued_at: opts.status === "sent" ? new Date().toISOString() : null,
      due_at: opts.dueAt ?? null,
      subtotal,
      vat,
      total,
      notes: opts.notes ?? null,
    })
    .select("*")
    .single();
  if (invErr) throw new Error(invErr.message);

  const { error: itemsErr } = await supabase.from("invoice_items").insert(
    lines.map((it) => ({ ...it, invoice_id: invoice.id }))
  );
  if (itemsErr) throw new Error(itemsErr.message);

  return invoice;
}

/** Ensure client exists for lead, then draft invoice from proposal pricing. */
export async function ensureClientAndInvoiceFromProposal(proposalId: string): Promise<{
  clientId: string;
  invoiceId: string | null;
  alreadyHadInvoice: boolean;
}> {
  const supabase = createServerSupabaseClient();
  const { data: proposal, error } = await supabase.from("proposals").select("*").eq("id", proposalId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!proposal) throw new Error("Proposal not found");

  const { data: existingInv } = await supabase
    .from("invoices")
    .select("id, client_id")
    .eq("proposal_id", proposalId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existingInv) {
    return { clientId: existingInv.client_id, invoiceId: existingInv.id, alreadyHadInvoice: true };
  }

  if (!proposal.lead_id) throw new Error("Proposal has no linked lead");

  const { data: lead, error: lErr } = await supabase.from("leads").select("*").eq("id", proposal.lead_id).maybeSingle();
  if (lErr) throw new Error(lErr.message);
  if (!lead) throw new Error("Lead not found");

  let clientId: string;
  const { data: existingClient } = await supabase.from("clients").select("id").eq("lead_id", lead.id).maybeSingle();
  if (existingClient) {
    clientId = existingClient.id;
  } else {
    const { data: created, error: cErr } = await supabase
      .from("clients")
      .insert({
        lead_id: lead.id,
        company_name: lead.company_name,
        contact_name: lead.contact_name,
        email: lead.email,
        phone: lead.phone,
        retainer_active: false,
        retainer_amount: null,
        total_revenue: 0,
      })
      .select("id")
      .single();
    if (cErr) throw new Error(cErr.message);
    clientId = created.id;
  }

  const doc = rowToProposalDocument(proposal);
  const items = lineItemsFromProposal(proposal, doc);
  const invoice = await createInvoiceForClient({
    clientId,
    leadId: lead.id,
    proposalId: proposal.id,
    items,
    notes: `Auto-created from accepted proposal: ${proposal.title}`,
  });

  return { clientId, invoiceId: invoice.id, alreadyHadInvoice: false };
}
