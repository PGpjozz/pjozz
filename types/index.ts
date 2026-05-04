/** JSON-compatible values for Supabase / API payloads */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type LeadServiceType =
  | "webapp"
  | "mobileapp"
  | "automation"
  | "network"
  | "security_cam"
  | "software";

export type LeadStatus =
  | "new"
  | "contacted"
  | "qualified"
  | "meeting"
  | "proposal"
  | "won"
  | "lost";

export interface Lead {
  id: string;
  companyName: string;
  contactName: string;
  email: string;
  phone: string | null;
  whatsapp: string | null;
  website: string | null;
  industry: string | null;
  serviceType: LeadServiceType;
  leadScore: number;
  status: LeadStatus;
  source: string | null;
  enrichmentData: Json | null;
  createdAt: string;
  updatedAt: string;
}

export type CampaignType = "email" | "linkedin" | "whatsapp" | "multichannel";

export type CampaignStatus = "draft" | "active" | "paused" | "completed";

export type CampaignEnrollmentStatus =
  | "active"
  | "paused"
  | "replied"
  | "bounced"
  | "unsubscribed"
  | "completed";

/** Mon–Fri etc. + SAST-style send window (interpreted with IANA timezone). */
export interface CampaignSendWindow {
  weekdays: number[];
  startHour: number;
  endHour: number;
  timezone: string;
}

export interface CampaignSettings {
  sendWindow: CampaignSendWindow;
  dailySendLimit: number;
  pauseOnReply: boolean;
  blocklistOnUnsubscribe: boolean;
  /** Used by AI sequence generation / regenerate. */
  serviceFocus?: LeadServiceType;
}

/** One step in the outreach sequence editor (stored in `campaigns.sequence` JSON). */
export interface OutreachSequenceStep {
  id: string;
  channel: "email" | "whatsapp" | "linkedin";
  delayKind: "immediate" | "wait_days";
  delayDays: number;
  subject?: string;
  body: string;
  templateSource?: "ai" | "custom";
}

export interface Campaign {
  id: string;
  name: string;
  description?: string | null;
  type: CampaignType;
  sequence: OutreachSequenceStep[];
  settings?: CampaignSettings;
  status: CampaignStatus;
  leadsCount: number;
  sentCount: number;
  openedCount: number;
  repliedCount: number;
  openRate: number;
  replyRate: number;
  createdAt: string;
  updatedAt?: string;
}

export type ProposalStatus = "draft" | "sent" | "accepted" | "rejected";

/** Line items or tiers stored as structured JSON */
export interface ProposalPricing {
  currency: string;
  items: Array<{
    label: string;
    amount: number;
    recurring?: boolean;
  }>;
  notes?: string;
}

export interface Proposal {
  id: string;
  leadId: string;
  title: string;
  scope: string;
  timeline: string;
  pricing: ProposalPricing | Json;
  status: ProposalStatus;
  generatedByAI: boolean;
  createdAt: string;
}

export interface Client {
  id: string;
  leadId: string | null;
  companyName: string;
  contactName: string;
  email: string;
  activeProjects: number;
  retainerActive: boolean;
  totalRevenue: number;
  createdAt: string;
}

export interface PipelineStage {
  id: string;
  leadId: string;
  stage: string;
  probability: number;
  value: number;
  expectedCloseDate: string | null;
  notes: string | null;
}

export type AIInsightType =
  | "lead_score"
  | "follow_up"
  | "risk"
  | "opportunity"
  | "proposal"
  | "general";

export type AIInsightPriority = "low" | "medium" | "high" | "critical";

export interface AIInsight {
  id: string;
  type: AIInsightType;
  message: string;
  priority: AIInsightPriority;
  actionRequired: boolean;
  relatedId: string | null;
  createdAt: string;
}
