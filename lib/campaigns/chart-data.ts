import { createServerSupabaseClient } from "@/lib/db/supabase";

export type CampaignChartPoint = { label: string; sent: number; opened: number; replied: number };

export async function loadCampaignChartSeries(dayCount = 42): Promise<CampaignChartPoint[]> {
  const supabase = createServerSupabaseClient();
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - dayCount);
  const { data, error } = await supabase
    .from("outreach_events")
    .select("created_at, type")
    .gte("created_at", since.toISOString())
    .not("campaign_id", "is", null);
  if (error) throw new Error(error.message);

  const buckets = new Map<string, { sent: number; opened: number; replied: number }>();
  for (const row of data ?? []) {
    const day = row.created_at.slice(0, 10);
    if (!buckets.has(day)) buckets.set(day, { sent: 0, opened: 0, replied: 0 });
    const b = buckets.get(day)!;
    if (row.type === "email_sent" || row.type === "whatsapp_sent" || row.type === "linkedin_connected") b.sent += 1;
    if (row.type === "email_opened") b.opened += 1;
    if (row.type === "email_replied") b.replied += 1;
  }

  const labels = Array.from(buckets.keys()).sort();
  return labels.map((label) => {
    const b = buckets.get(label)!;
    return { label, sent: b.sent, opened: b.opened, replied: b.replied };
  });
}
