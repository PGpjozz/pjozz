import type { LeadServiceType } from "@/types";

/** Curated Google queries aimed at startups & SMBs (especially ZA) where Pjozz services fit. */
export type DiscoveryPreset = {
  label: string;
  /** Full search string sent to Google Programmable Search */
  query: string;
  /** Short hint for operators */
  hint: string;
  /** Default service tags when importing from this preset */
  suggestServices: LeadServiceType[];
};

export const STARTUP_SMB_PRESETS: DiscoveryPreset[] = [
  {
    label: "Tech startups (ZA)",
    query: "South African tech startup software company official website",
    hint: "Early-stage product teams — web apps, integrations",
    suggestServices: ["webapp", "software", "automation"],
  },
  {
    label: "Small retail & shops",
    query: "small retail business South Africa contact website shop store",
    hint: "POS, sites, Wi‑Fi, cameras",
    suggestServices: ["webapp", "network", "security_cam"],
  },
  {
    label: "Hospitality & guesthouses",
    query: "guest house lodge bed breakfast South Africa booking website",
    hint: "Booking flows, Wi‑Fi, CCTV",
    suggestServices: ["webapp", "network", "security_cam"],
  },
  {
    label: "Construction & logistics SMEs",
    query: "construction logistics SME South Africa company website Johannesburg",
    hint: "Fleet/tool tracking, site connectivity",
    suggestServices: ["automation", "network", "software"],
  },
  {
    label: "Manufacturing SMEs",
    query: "small manufacturing company South Africa factory contact website",
    hint: "Automation, networks, custom software",
    suggestServices: ["automation", "network", "software"],
  },
  {
    label: "Professional services SMEs",
    query: "accounting legal consultancy small firm South Africa professional website",
    hint: "Internal tools, secure infra",
    suggestServices: ["software", "network", "webapp"],
  },
];

export const ZA_CITIES = [
  "Johannesburg",
  "Pretoria",
  "Cape Town",
  "Durban",
  "Gqeberha",
  "Bloemfontein",
  "Polokwane",
  "Nelspruit",
  "East London",
  "Rustenburg",
] as const;

export const ZA_INDUSTRIES = [
  "construction",
  "logistics",
  "transport",
  "retail",
  "hospitality",
  "manufacturing",
  "security company",
  "accounting firm",
  "law firm",
  "real estate agency",
  "medical practice",
  "warehouse",
] as const;

/**
 * Expand a base preset query into multiple targeted variants to increase coverage.
 * Keep caps so you don't blow API quotas accidentally.
 */
export function expandPresetQueries(preset: DiscoveryPreset, opts?: { maxCities?: number; maxIndustries?: number }): Array<{ label: string; query: string; hint?: string }> {
  const maxCities = Math.max(0, Math.min(ZA_CITIES.length, opts?.maxCities ?? 5));
  const maxIndustries = Math.max(0, Math.min(ZA_INDUSTRIES.length, opts?.maxIndustries ?? 6));

  const out: Array<{ label: string; query: string; hint?: string }> = [{ label: preset.label, query: preset.query, hint: preset.hint }];

  for (const city of ZA_CITIES.slice(0, maxCities)) {
    out.push({
      label: `${preset.label} — ${city}`,
      query: `${preset.query} ${city} contact email website`,
      hint: preset.hint,
    });
  }

  for (const ind of ZA_INDUSTRIES.slice(0, maxIndustries)) {
    out.push({
      label: `${preset.label} — ${ind}`,
      query: `${preset.query} ${ind} South Africa contact email website`,
      hint: preset.hint,
    });
  }

  return out;
}
