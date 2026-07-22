import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PublicProposalClient } from "@/components/proposals/public-proposal-client";
import { createServerSupabaseClient } from "@/lib/db/supabase";
import { rowToProposalDocument } from "@/lib/proposals/document";
import { SITE } from "@/lib/site-config";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: { token: string };
}): Promise<Metadata> {
  const token = decodeURIComponent(params.token);
  try {
    const supabase = createServerSupabaseClient();
    const { data } = await supabase
      .from("proposals")
      .select("title, status")
      .eq("share_token", token)
      .maybeSingle();
    if (!data || data.status === "draft") {
      return { title: "Proposal not found", robots: { index: false, follow: false } };
    }
    return {
      title: data.title || "Proposal",
      description: `Secure proposal from ${SITE.name}. Review, download PDF, accept, or request changes.`,
      robots: { index: false, follow: false },
    };
  } catch {
    return { title: "Proposal", robots: { index: false, follow: false } };
  }
}

export default async function PublicProposalPage({ params }: { params: { token: string } }) {
  const token = decodeURIComponent(params.token);
  const supabase = createServerSupabaseClient();
  const { data: proposal, error } = await supabase
    .from("proposals")
    .select("*")
    .eq("share_token", token)
    .maybeSingle();

  if (error || !proposal || proposal.status === "draft") {
    return (
      <ProposalGate
        title="Proposal not found"
        body="This link is invalid or the proposal is no longer available. Check the email we sent you, or open the Client hub and paste your link again."
      />
    );
  }

  const doc = rowToProposalDocument(proposal);
  if (!doc) notFound();

  const locked = proposal.status === "expired" || proposal.status === "rejected";

  return (
    <PublicProposalClient
      proposal={proposal}
      document={doc}
      token={token}
      interactionLocked={locked}
      lockReason={
        proposal.status === "expired"
          ? "This proposal has expired. Contact Pjozz for an updated version."
          : proposal.status === "rejected"
            ? "This proposal was closed. Contact Pjozz if you need a revised offer."
            : null
      }
    />
  );
}

function ProposalGate({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#fafafa] px-6 text-[#1a1a1a]">
      <div className="max-w-md rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-sm">
        <h1 className="font-heading text-2xl font-semibold text-zinc-900">{title}</h1>
        <p className="mt-3 text-sm leading-relaxed text-zinc-600">{body}</p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/client"
            className="inline-flex items-center justify-center rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800"
          >
            Client hub
          </Link>
          <Link
            href="/contact"
            className="inline-flex items-center justify-center rounded-lg border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
          >
            Contact us
          </Link>
        </div>
      </div>
    </div>
  );
}
