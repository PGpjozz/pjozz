import { Suspense } from "react";

import { ProposalNewClient } from "@/components/proposals/proposal-new-client";

export const dynamic = "force-dynamic";

export default function NewProposalPage() {
  return (
    <Suspense fallback={<div className="p-8 font-mono text-sm text-muted-foreground">Loading…</div>}>
      <ProposalNewClient />
    </Suspense>
  );
}
