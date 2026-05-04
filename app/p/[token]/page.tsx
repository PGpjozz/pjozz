import { notFound } from "next/navigation";

import { createServerSupabaseClient } from "@/lib/db/supabase";
import { rowToProposalDocument } from "@/lib/proposals/document";
import { PublicProposalClient } from "@/components/proposals/public-proposal-client";

export const dynamic = "force-dynamic";

export default async function PublicProposalPage({ params }: { params: { token: string } }) {
  const token = decodeURIComponent(params.token);
  const supabase = createServerSupabaseClient();
  const { data: proposal, error } = await supabase.from("proposals").select("*").eq("share_token", token).maybeSingle();
  if (error || !proposal || proposal.status === "draft") notFound();
  const doc = rowToProposalDocument(proposal);
  if (!doc) notFound();

  return <PublicProposalClient proposal={proposal} document={doc} token={token} />;
}
