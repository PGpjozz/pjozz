/** Reference ranges (ZAR) passed to the proposal AI — not binding quotes. */
export const PRICING_TEMPLATE_REFERENCE = [
  { id: "basic_webapp", label: "Basic webapp", minZar: 45_000, maxZar: 120_000 },
  { id: "ecommerce_webapp", label: "E-commerce webapp", minZar: 80_000, maxZar: 250_000 },
  { id: "mobile_app", label: "Mobile app (iOS + Android)", minZar: 150_000, maxZar: 450_000 },
  { id: "automation", label: "Automation system", minZar: 25_000, maxZar: 150_000 },
  { id: "network_smb", label: "Network infrastructure (SMB)", minZar: 15_000, maxZar: 80_000 },
  { id: "security_cam", label: "Security camera system", minZar: 8_000, maxZar: 60_000 },
  { id: "custom_software", label: "Custom software", minZar: 60_000, maxZar: 500_000 },
] as const;

export type PricingTemplateId = (typeof PRICING_TEMPLATE_REFERENCE)[number]["id"];

/** Map CRM `service_type` to closest template hint. */
export function pricingHintForServiceType(serviceType: string): string {
  const map: Record<string, PricingTemplateId> = {
    webapp: "basic_webapp",
    mobileapp: "mobile_app",
    automation: "automation",
    network: "network_smb",
    security_cam: "security_cam",
    software: "custom_software",
  };
  const id = map[serviceType] ?? "custom_software";
  const row = PRICING_TEMPLATE_REFERENCE.find((t) => t.id === id)!;
  return `${row.label}: typical engagement range R${row.minZar.toLocaleString("en-ZA")} – R${row.maxZar.toLocaleString("en-ZA")} (reference only; tailor tiers to discovery).`;
}

export function allPricingTemplatesSummary(): string {
  return PRICING_TEMPLATE_REFERENCE.map(
    (t) => `- ${t.label}: R${t.minZar.toLocaleString("en-ZA")} – R${t.maxZar.toLocaleString("en-ZA")}`
  ).join("\n");
}
