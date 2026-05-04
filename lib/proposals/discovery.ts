import { z } from "zod";

export const discoveryWizardSchema = z.object({
  discoveryNotes: z.string().min(1).max(20000),
  serviceType: z.string().min(1).max(120),
  budgetRange: z.string().max(120).optional(),
  timelinePreference: z.string().max(120).optional(),
  specialRequirements: z.string().max(8000).optional(),
});

export type DiscoveryWizard = z.infer<typeof discoveryWizardSchema>;
