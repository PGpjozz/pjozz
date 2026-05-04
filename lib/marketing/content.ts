/** Static marketing copy & structured data — source for pages + GET /api/marketing/* */

export type PricingTier = { name: string; priceLabel: string; bullets: string[] };

export type MarketingService = {
  slug: string;
  title: string;
  tagline: string;
  description: string;
  features: string[];
  useCases: string[];
  tiers?: PricingTier[];
};

export type IndustrySolution = {
  slug: string;
  industry: string;
  problem: string;
  solution: string;
  benefits: string[];
};

export type CaseStudy = {
  slug: string;
  title: string;
  problem: string;
  solution: string;
  technologies: string[];
  results: string[];
};

export const COMPANY = {
  mission: "Empowering African businesses with intelligent technology.",
  vision:
    "A continent where every growing business runs on reliable, AI-ready systems — not spreadsheets and guesswork.",
  locations: ["Johannesburg", "Soweto", "South Africa"],
  phoneDisplay: "+27 (0) XX XXX XXXX",
  emailDisplay: "hello@pjozz.co.za",
};

export const testimonials = [
  {
    quote: "They replaced three manual workflows with one dashboard. Our team finally sees pipeline and delivery in one place.",
    author: "Operations Director",
    company: "Regional logistics firm",
  },
  {
    quote: "The AI-assisted proposal cycle cut our quote-to-sign time dramatically. Clients get clarity faster.",
    author: "Founder",
    company: "B2B services startup",
  },
  {
    quote: "Network + CCTV rollout was documented properly — handover wasn't a firefight.",
    author: "Facilities Manager",
    company: "Multi-site retail",
  },
] as const;

export const marketingServices: MarketingService[] = [
  {
    slug: "ai-systems",
    title: "AI Systems",
    tagline: "Models, agents, and insights wired into your operations.",
    description:
      "We design AI that pays rent: scoring, forecasting, document workflows, and operator copilots — grounded in your data and governance.",
    features: [
      "LLM workflows with retrieval & guardrails",
      "Lead scoring & CRM insights",
      "Document & ticket classification",
      "Monitoring hooks & evaluation loops",
    ],
    useCases: ["Sales intelligence", "Support triage", "Executive briefings", "Compliance-aware drafting"],
    tiers: [
      {
        name: "Starter",
        priceLabel: "From R25k setup + usage",
        bullets: ["One workflow", "Monthly model review", "Email support"],
      },
      {
        name: "Business",
        priceLabel: "From R75k + retainer",
        bullets: ["Multi-workflow", "SSO-ready patterns", "SLA window", "Fine-tune roadmap"],
      },
      {
        name: "Enterprise",
        priceLabel: "Custom",
        bullets: ["Private data boundaries", "Audit trails", "On-call rotation", "Multi-tenant ready"],
      },
    ],
  },
  {
    slug: "automation",
    title: "Business Automation",
    tagline: "Orchestrate people, software, and hardware with fewer handoffs.",
    description:
      "From n8n-style orchestration to custom services — we connect CRM, finance, comms, and line-of-business tools so work flows without copy-paste.",
    features: [
      "Event-driven pipelines",
      "Idempotent webhooks & retries",
      "Human-in-the-loop approvals",
      "Observability: logs, alerts, runbooks",
    ],
    useCases: ["Order-to-cash", "Onboarding", "Field job dispatch", "Reconciliation"],
    tiers: [
      { name: "Starter", priceLabel: "From R15k", bullets: ["1–2 integrations", "Runbook", "Email alerts"] },
      { name: "Business", priceLabel: "From R45k", bullets: ["Multi-system", "Queues", "SLA", "Dashboards"] },
      { name: "Enterprise", priceLabel: "Custom", bullets: ["HA patterns", "Security review", "24/7 option"] },
    ],
  },
  {
    slug: "web-app",
    title: "Web & App Development",
    tagline: "Product-grade software for customers and internal teams.",
    description:
      "We ship fast, maintainable applications: customer portals, operator dashboards, and APIs — with SEO, performance, and access control in mind.",
    features: [
      "Next.js / modern web stacks",
      "Mobile apps where field work matters",
      "API design & versioning",
      "CI/CD and staging environments",
    ],
    useCases: ["Client portals", "Field inspections", "Inventory & asset tracking", "Subscription billing UI"],
  },
  {
    slug: "infrastructure",
    title: "Infrastructure (Networking & CCTV)",
    tagline: "Resilient connectivity and evidence-grade surveillance.",
    description:
      "LAN/WAN design, Wi-Fi, segmentation for retail and offices, plus CCTV design/install that survives load-shedding and real audit questions.",
    features: ["Site surveys", "Structured cabling partners", "Firewall/VLAN hygiene", "NVR/VMS commissioning"],
    useCases: ["Retail chains", "Warehousing", "Schools & campuses", "Residential estates"],
  },
];

export const industrySolutions: IndustrySolution[] = [
  {
    slug: "education",
    industry: "Education",
    problem: "Fragmented student data, manual reporting, and limited visibility for parents and administrators.",
    solution: "Unified portals, attendance integrations, and dashboards that surface progression early.",
    benefits: ["Fewer admin hours", "Earlier intervention", "Transparent reporting"],
  },
  {
    slug: "small-business",
    industry: "Small businesses",
    problem: "Tools don’t talk — invoices, leads, and delivery live in different places.",
    solution: "Light CRM + automation spine so quotes, jobs, and payments stay aligned.",
    benefits: ["Less rework", "Faster payments", "Clear pipeline"],
  },
  {
    slug: "retail",
    industry: "Retail",
    problem: "Shrinkage, inconsistent branch uptime, and CCTV that doesn’t help after incidents.",
    solution: "Network hardening, segmented Wi‑Fi, and CCTV systems operators can actually use.",
    benefits: ["Evidence-ready footage", "Stable POS connectivity", "Repeatable rollouts"],
  },
  {
    slug: "security",
    industry: "Security & guarding",
    problem: "Incidents need timelines and proof — spreadsheets don’t cut it.",
    solution: "Incident workflows, camera placement discipline, and retrieval runbooks.",
    benefits: ["Chain of evidence", "Faster investigations", "Audit-friendly ops"],
  },
  {
    slug: "clinics",
    industry: "Clinics & practices",
    problem: "Scheduling friction and repetitive patient comms burn clinician time.",
    solution: "Appointment flows, reminders, and lightweight integrations — privacy-conscious by design.",
    benefits: ["Reduced no-shows", "Staff focus on care", "Operational clarity"],
  },
];

export const caseStudies: CaseStudy[] = [
  {
    slug: "student-progress-tracker",
    title: "Student Progress Tracker",
    problem: "School needed guardians and staff to see learner progress without drowning in spreadsheets.",
    solution: "Role-based web portal with milestones, alerts for at‑risk learners, and exportable reports.",
    technologies: ["Next.js", "PostgreSQL", "Supabase", "Tailwind CSS"],
    results: ["40% less reporting prep time (est.)", "Single source of truth for academic leads", "Mobile-friendly for parents"],
  },
  {
    slug: "ai-chatbot-system",
    title: "AI Chatbot & Knowledge System",
    problem: "High volume of repeated questions to operations; static FAQ was always out of date.",
    solution: "Retrieval-grounded assistant with human handoff, feedback loop, and content refresh workflow.",
    technologies: ["Claude / LLM APIs", "Vector store", "Next.js", "Webhooks"],
    results: ["Faster first response", "Consistent answers from approved sources", "Measurable deflection rate"],
  },
  {
    slug: "business-automation",
    title: "Business Automation Backbone",
    problem: "Order data lived in email; finance discovered issues late monthly.",
    solution: "Event-driven pipeline from CRM to finance with exceptions routed to Slack/email with context.",
    technologies: ["n8n-style orchestration", "REST & webhooks", "Idempotent workers", "Observability"],
    results: ["Cut manual reconciliation batch", "Earlier detection of stuck orders", "Full audit trail per event"],
  },
];

export const skillsBadges = [
  "TypeScript / React / Next.js",
  "Node & API design",
  "PostgreSQL / Supabase",
  "AI (Claude, RAG, evals)",
  "Automation & integrations",
  "Networks & CCTV delivery",
] as const;
