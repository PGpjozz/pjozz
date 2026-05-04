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
