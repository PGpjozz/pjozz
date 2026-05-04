import type { CampaignType } from "@/types";

const TYPE_LABEL: Record<CampaignType, string> = {
  email: "Email",
  whatsapp: "WhatsApp",
  linkedin: "LinkedIn",
  multichannel: "Multi-channel",
};

export function campaignTypeLabel(t: CampaignType | null | undefined): string {
  if (!t) return "—";
  return TYPE_LABEL[t] ?? t;
}

export function campaignStatusLabel(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
