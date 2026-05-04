import { LeadDetailView } from "@/components/leads/lead-detail-view";

export const dynamic = "force-dynamic";

export default function LeadDetailPage({ params }: { params: { id: string } }) {
  return <LeadDetailView leadId={params.id} mode="page" />;
}
