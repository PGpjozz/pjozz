import type { AIInsight } from "@/types";

/** Loose input for lead scoring (form, webhook, enrichment). */
export interface RawLeadData {
  companyName?: string;
  contactName?: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  website?: string;
  industry?: string;
  serviceInterest?: string;
  notes?: string;
  location?: string;
  /** Freeform hints: hiring, new branch, tech stack, etc. */
  signals?: string[];
}

export interface LeadAnalysis {
  score: number;
  serviceMatch: string[];
  reasoning: string;
  suggestedApproach: string;
  redFlags: string[];
}

export interface EmailDraft {
  subject: string;
  body: string;
  previewText: string;
}

export interface ProposalContent {
  title: string;
  executiveSummary: string;
  problemStatement: string;
  proposedSolution: string;
  deliverables: Array<{ item: string; description: string; included: boolean }>;
  timeline: Array<{ phase: string; duration: string; description: string }>;
  investmentOptions: Array<{
    tier: string;
    price: number;
    description: string;
    features: string[];
  }>;
  whyPjozz: string;
  nextSteps: string;
}

/** Aggregated CRM snapshot for the daily brief. */
export interface DashboardSnapshot {
  generatedAt: string;
  leadCounts: {
    /** Total leads in CRM (all statuses). */
    total: number;
    /** Leads in active statuses (new → proposal). */
    active: number;
  };
  pipelineByStage: Array<{
    stage: string;
    dealCount: number;
    weightedValue: number;
  }>;
  leadsNeedingAttention: Array<{
    leadId: string;
    companyName: string;
    status: string;
    daysSinceActivity: number;
    leadScore: number;
  }>;
  dealsAtRisk: Array<{
    pipelineId: string;
    leadId: string;
    companyName: string;
    stage: string;
    daysInStage: number;
    dealValue: number | null;
  }>;
  hotLeadsNotFollowedUp: Array<{
    leadId: string;
    companyName: string;
    leadScore: number;
    status: string;
    daysSinceCreated: number;
  }>;
  forecast: {
    openPipelineValue: number;
    weightedForecast: number;
    wonLast30DaysZar: number;
  };
}

export interface DailyBrief {
  summary: string;
  alerts: AIInsight[];
  topActions: string[];
  forecastNote: string;
}
