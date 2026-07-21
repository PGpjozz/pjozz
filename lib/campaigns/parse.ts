import { z } from "zod";

import type { Json } from "@/lib/db/database.types";
import type { CampaignSettings, LeadServiceType, OutreachSequenceStep } from "@/types";

import { defaultCampaignSettings } from "./defaults";

const leadServiceType = z.enum([
  "webapp",
  "mobileapp",
  "automation",
  "network",
  "security_cam",
  "software",
]) satisfies z.ZodType<LeadServiceType>;

const sendWindowSchema = z.object({
  weekdays: z.array(z.number().int().min(1).max(7)).min(1),
  startHour: z.number().int().min(0).max(23),
  /** Exclusive end hour; 24 = through end of day (matches settings registry). */
  endHour: z.number().int().min(1).max(24),
  timezone: z.string().min(1),
});

const settingsSchema = z.object({
  sendWindow: sendWindowSchema,
  dailySendLimit: z.number().int().min(1).max(10_000),
  pauseOnReply: z.boolean(),
  blocklistOnUnsubscribe: z.boolean(),
  serviceFocus: leadServiceType.optional(),
});

const stepSchema = z.object({
  id: z.string().min(1),
  channel: z.enum(["email", "whatsapp", "linkedin"]),
  delayKind: z.enum(["immediate", "wait_days"]),
  delayDays: z.number().int().min(0).max(365),
  subject: z.string().optional(),
  body: z.string(),
  templateSource: z.enum(["ai", "custom"]).optional(),
});

export function parseCampaignSettings(raw: Json | null | undefined): CampaignSettings {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const p = settingsSchema.safeParse(raw);
    if (p.success) return p.data;
  }
  return defaultCampaignSettings();
}

export function parseSequence(raw: unknown): OutreachSequenceStep[] {
  if (!Array.isArray(raw)) return [];
  const out: OutreachSequenceStep[] = [];
  for (const item of raw) {
    const p = stepSchema.safeParse(item);
    if (p.success) out.push(p.data);
  }
  return out;
}
