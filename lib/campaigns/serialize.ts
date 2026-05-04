import type { Tables } from "@/lib/db/supabase";
import type { Campaign } from "@/types";

import { parseCampaignSettings, parseSequence } from "./parse";

export function campaignRowToApi(row: Tables<"campaigns">): Campaign {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    type: (row.type === "whatsapp" || row.type === "linkedin" || row.type === "multichannel" || row.type === "email"
      ? row.type
      : "email") as Campaign["type"],
    sequence: parseSequence(row.sequence),
    settings: parseCampaignSettings(row.settings),
    status: row.status,
    leadsCount: row.leads_count,
    sentCount: row.sent_count,
    openedCount: row.opened_count,
    repliedCount: row.replied_count,
    openRate: Number(row.open_rate),
    replyRate: Number(row.reply_rate),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
