import { CampaignDetailClient } from "@/components/outreach/campaign-detail-client";

export const dynamic = "force-dynamic";

export default function CampaignDetailPage({ params }: { params: { id: string } }) {
  return <CampaignDetailClient id={params.id} />;
}
