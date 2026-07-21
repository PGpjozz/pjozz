import { z } from "zod";

import type { Json } from "@/lib/db/database.types";

export const SETTINGS_KEYS = [
  "ai.lead_thresholds",
  "outreach.defaults",
  "billing.defaults",
  "proposals.defaults",
  "features.flags",
] as const;

export type SettingsKey = (typeof SETTINGS_KEYS)[number];

export const AiLeadThresholdsSchema = z.object({
  hotLeadScore: z.number().int().min(0).max(100).default(70),
  qualifiedScore: z.number().int().min(0).max(100).default(70),
  staleLeadDays: z.number().int().min(1).max(365).default(5),
  riskyDealDaysInStage: z.number().int().min(1).max(3650).default(14),
  followUpGraceDays: z.number().int().min(0).max(365).default(2),
});

export type AiLeadThresholds = z.infer<typeof AiLeadThresholdsSchema>;

export const OutreachDefaultsSchema = z.object({
  sendWindow: z
    .object({
      weekdays: z.array(z.number().int().min(1).max(7)).min(1).default([1, 2, 3, 4, 5]),
      startHour: z.number().int().min(0).max(23).default(8),
      endHour: z.number().int().min(1).max(24).default(17),
      timezone: z.string().min(1).default("Africa/Johannesburg"),
    })
    .default(() => ({
      weekdays: [1, 2, 3, 4, 5],
      startHour: 8,
      endHour: 17,
      timezone: "Africa/Johannesburg",
    })),
  dailySendLimit: z.number().int().min(1).max(10_000).default(50),
  pauseOnReply: z.boolean().default(true),
  blocklistOnUnsubscribe: z.boolean().default(true),
});

export type OutreachDefaults = z.infer<typeof OutreachDefaultsSchema>;

export const BillingDefaultsSchema = z.object({
  vatRate: z.number().min(0).max(1).default(0.15),
  currency: z.string().min(3).max(8).default("ZAR"),
  invoicePrefix: z.string().min(1).max(12).default("INV"),
});

export type BillingDefaults = z.infer<typeof BillingDefaultsSchema>;

export const ProposalsDefaultsSchema = z.object({
  currency: z.string().min(3).max(8).default("ZAR"),
  defaultTitle: z.string().min(1).max(120).default("Draft proposal"),
  template: z
    .object({
      sections: z
        .array(
          z.object({
            key: z.string().min(1).max(40),
            title: z.string().min(1).max(80),
            enabled: z.boolean().default(true),
            defaultText: z.string().max(20_000).optional(),
          })
        )
        .min(1),
    })
    .default({
      sections: [
        { key: "executiveSummary", title: "Executive summary", enabled: true },
        { key: "problemStatement", title: "Problem statement", enabled: true },
        { key: "proposedSolution", title: "Proposed solution", enabled: true },
        { key: "whyPjozz", title: "Why Pjozz", enabled: true },
        { key: "nextSteps", title: "Next steps", enabled: true },
      ],
    }),
});

export type ProposalsDefaults = z.infer<typeof ProposalsDefaultsSchema>;

/** Keys used by ProposalContent / create + AI improve flows. */
export const PROPOSAL_CONTENT_SECTION_KEYS = [
  "executiveSummary",
  "problemStatement",
  "proposedSolution",
  "whyPjozz",
  "nextSteps",
] as const;

export function normalizeProposalsDefaults(value: ProposalsDefaults): ProposalsDefaults {
  const keys = new Set(value.template.sections.map((s) => s.key));
  const hasContentKey = PROPOSAL_CONTENT_SECTION_KEYS.some((k) => keys.has(k));
  if (hasContentKey) return value;
  // Legacy template keys (scope/deliverables/…) never applied to document_json — reset.
  return {
    ...value,
    template: defaultsFromSchema(ProposalsDefaultsSchema).template,
  };
}

export const FeatureFlagsSchema = z.object({
  enableAi: z.boolean().default(true),
  enableWhatsApp: z.boolean().default(true),
  enableResendEmail: z.boolean().default(true),
  enableOutreachAutomation: z.boolean().default(true),
});

export type FeatureFlags = z.infer<typeof FeatureFlagsSchema>;

export type SettingsValueMap = {
  "ai.lead_thresholds": AiLeadThresholds;
  "outreach.defaults": OutreachDefaults;
  "billing.defaults": BillingDefaults;
  "proposals.defaults": ProposalsDefaults;
  "features.flags": FeatureFlags;
};

type RegistryEntry<T> = {
  key: SettingsKey;
  schema: z.ZodType<T>;
  defaultValue: T;
  /** Prevent returning values to the client (kept for future). */
  sensitive?: boolean;
};

function defaultsFromSchema<T>(schema: z.ZodType<T>): T {
  // We rely on `.default(...)` in schemas so parsing {} yields a full shape.
  return schema.parse({});
}

export const SETTINGS_REGISTRY: { [K in SettingsKey]: RegistryEntry<SettingsValueMap[K]> } = {
  "ai.lead_thresholds": {
    key: "ai.lead_thresholds",
    schema: AiLeadThresholdsSchema,
    defaultValue: defaultsFromSchema(AiLeadThresholdsSchema),
  },
  "outreach.defaults": {
    key: "outreach.defaults",
    schema: OutreachDefaultsSchema,
    defaultValue: defaultsFromSchema(OutreachDefaultsSchema),
  },
  "billing.defaults": {
    key: "billing.defaults",
    schema: BillingDefaultsSchema,
    defaultValue: defaultsFromSchema(BillingDefaultsSchema),
  },
  "proposals.defaults": {
    key: "proposals.defaults",
    schema: ProposalsDefaultsSchema,
    defaultValue: defaultsFromSchema(ProposalsDefaultsSchema),
  },
  "features.flags": {
    key: "features.flags",
    schema: FeatureFlagsSchema,
    defaultValue: defaultsFromSchema(FeatureFlagsSchema),
  },
};

export function isSettingsKey(key: string): key is SettingsKey {
  return SETTINGS_KEYS.includes(key as SettingsKey);
}

export function coerceSettingValue(key: SettingsKey, value: unknown): Json {
  const entry = SETTINGS_REGISTRY[key];
  const parsed = entry.schema.parse(value);
  return parsed as unknown as Json;
}

