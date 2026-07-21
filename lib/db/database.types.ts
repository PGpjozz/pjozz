export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

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

export type CampaignType = "email" | "linkedin" | "whatsapp" | "multichannel";
export type CampaignStatus = "draft" | "active" | "paused" | "completed";

export type CampaignEnrollmentStatus =
  | "active"
  | "paused"
  | "replied"
  | "bounced"
  | "unsubscribed"
  | "completed";

export type OutreachEventType =
  | "email_sent"
  | "email_opened"
  | "email_replied"
  | "email_clicked"
  | "email_bounced"
  | "email_complained"
  | "email_unsubscribed"
  | "linkedin_connected"
  | "whatsapp_sent"
  | "whatsapp_replied"
  | "meeting_booked"
  | "proposal_accepted";

export type ProposalStatus = "draft" | "sent" | "accepted" | "rejected" | "expired";

export type InvoiceStatus = "draft" | "sent" | "paid" | "overdue" | "void";
export type PaymentPlanStatus = "active" | "completed" | "cancelled";
export type PaymentPlanItemStatus = "due" | "paid" | "void";

export type AIInsightType = "action_required" | "warning" | "opportunity" | "daily_brief";
export type AIInsightPriority = "low" | "medium" | "high" | "critical";

export interface Database {
  public: {
    Tables: {
      leads: {
        Row: {
          id: string;
          company_name: string;
          contact_name: string | null;
          email: string | null;
          phone: string | null;
          whatsapp: string | null;
          website: string | null;
          industry: string | null;
          service_type: LeadServiceType | null;
          lead_score: number;
          status: LeadStatus;
          source: string | null;
          enrichment_data: Json;
          ai_notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_name: string;
          contact_name?: string | null;
          email?: string | null;
          phone?: string | null;
          whatsapp?: string | null;
          website?: string | null;
          industry?: string | null;
          service_type?: LeadServiceType | null;
          lead_score?: number;
          status?: LeadStatus;
          source?: string | null;
          enrichment_data?: Json;
          ai_notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          company_name?: string;
          contact_name?: string | null;
          email?: string | null;
          phone?: string | null;
          whatsapp?: string | null;
          website?: string | null;
          industry?: string | null;
          service_type?: LeadServiceType | null;
          lead_score?: number;
          status?: LeadStatus;
          source?: string | null;
          enrichment_data?: Json;
          ai_notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      campaigns: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          type: CampaignType | null;
          sequence: Json;
          settings: Json;
          status: CampaignStatus;
          leads_count: number;
          sent_count: number;
          opened_count: number;
          replied_count: number;
          open_rate: number;
          reply_rate: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          type?: CampaignType | null;
          sequence?: Json;
          settings?: Json;
          status?: CampaignStatus;
          leads_count?: number;
          sent_count?: number;
          opened_count?: number;
          replied_count?: number;
          open_rate?: number;
          reply_rate?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          type?: CampaignType | null;
          sequence?: Json;
          settings?: Json;
          status?: CampaignStatus;
          leads_count?: number;
          sent_count?: number;
          opened_count?: number;
          replied_count?: number;
          open_rate?: number;
          reply_rate?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      campaign_enrollments: {
        Row: {
          id: string;
          campaign_id: string;
          lead_id: string;
          current_step_index: number;
          status: CampaignEnrollmentStatus;
          next_send_after: string | null;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          campaign_id: string;
          lead_id: string;
          current_step_index?: number;
          status?: CampaignEnrollmentStatus;
          next_send_after?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          campaign_id?: string;
          lead_id?: string;
          current_step_index?: number;
          status?: CampaignEnrollmentStatus;
          next_send_after?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "campaign_enrollments_campaign_id_fkey";
            columns: ["campaign_id"];
            isOneToOne: false;
            referencedRelation: "campaigns";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "campaign_enrollments_lead_id_fkey";
            columns: ["lead_id"];
            isOneToOne: false;
            referencedRelation: "leads";
            referencedColumns: ["id"];
          },
        ];
      };
      email_suppressions: {
        Row: {
          email: string;
          reason: string;
          source_campaign_id: string | null;
          created_at: string;
        };
        Insert: {
          email: string;
          reason: string;
          source_campaign_id?: string | null;
          created_at?: string;
        };
        Update: {
          email?: string;
          reason?: string;
          source_campaign_id?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "email_suppressions_source_campaign_id_fkey";
            columns: ["source_campaign_id"];
            isOneToOne: false;
            referencedRelation: "campaigns";
            referencedColumns: ["id"];
          },
        ];
      };
      outreach_events: {
        Row: {
          id: string;
          lead_id: string | null;
          campaign_id: string | null;
          type: OutreachEventType;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          lead_id?: string | null;
          campaign_id?: string | null;
          type: OutreachEventType;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          lead_id?: string | null;
          campaign_id?: string | null;
          type?: OutreachEventType;
          metadata?: Json;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "outreach_events_lead_id_fkey";
            columns: ["lead_id"];
            isOneToOne: false;
            referencedRelation: "leads";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "outreach_events_campaign_id_fkey";
            columns: ["campaign_id"];
            isOneToOne: false;
            referencedRelation: "campaigns";
            referencedColumns: ["id"];
          },
        ];
      };
      proposals: {
        Row: {
          id: string;
          lead_id: string | null;
          title: string;
          scope: string | null;
          deliverables: Json;
          timeline: string | null;
          pricing: Json;
          total_value: number | null;
          currency: string;
          status: ProposalStatus;
          generated_by_ai: boolean;
          sent_at: string | null;
          document_json: Json;
          discovery_json: Json;
          share_token: string | null;
          accepted_at: string | null;
          change_request_note: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          lead_id?: string | null;
          title: string;
          scope?: string | null;
          deliverables?: Json;
          timeline?: string | null;
          pricing?: Json;
          total_value?: number | null;
          currency?: string;
          status?: ProposalStatus;
          generated_by_ai?: boolean;
          sent_at?: string | null;
          document_json?: Json;
          discovery_json?: Json;
          share_token?: string | null;
          accepted_at?: string | null;
          change_request_note?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          lead_id?: string | null;
          title?: string;
          scope?: string | null;
          deliverables?: Json;
          timeline?: string | null;
          pricing?: Json;
          total_value?: number | null;
          currency?: string;
          status?: ProposalStatus;
          generated_by_ai?: boolean;
          sent_at?: string | null;
          document_json?: Json;
          discovery_json?: Json;
          share_token?: string | null;
          accepted_at?: string | null;
          change_request_note?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "proposals_lead_id_fkey";
            columns: ["lead_id"];
            isOneToOne: false;
            referencedRelation: "leads";
            referencedColumns: ["id"];
          },
        ];
      };
      clients: {
        Row: {
          id: string;
          lead_id: string | null;
          company_name: string;
          contact_name: string | null;
          email: string | null;
          phone: string | null;
          retainer_active: boolean;
          retainer_amount: number | null;
          total_revenue: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          lead_id?: string | null;
          company_name: string;
          contact_name?: string | null;
          email?: string | null;
          phone?: string | null;
          retainer_active?: boolean;
          retainer_amount?: number | null;
          total_revenue?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          lead_id?: string | null;
          company_name?: string;
          contact_name?: string | null;
          email?: string | null;
          phone?: string | null;
          retainer_active?: boolean;
          retainer_amount?: number | null;
          total_revenue?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "clients_lead_id_fkey";
            columns: ["lead_id"];
            isOneToOne: false;
            referencedRelation: "leads";
            referencedColumns: ["id"];
          },
        ];
      };
      invoices: {
        Row: {
          id: string;
          client_id: string;
          lead_id: string | null;
          proposal_id: string | null;
          invoice_number: string;
          status: InvoiceStatus;
          currency: string;
          issued_at: string | null;
          due_at: string | null;
          subtotal: number;
          vat: number;
          total: number;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          client_id: string;
          lead_id?: string | null;
          proposal_id?: string | null;
          invoice_number: string;
          status?: InvoiceStatus;
          currency?: string;
          issued_at?: string | null;
          due_at?: string | null;
          subtotal?: number;
          vat?: number;
          total?: number;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          client_id?: string;
          lead_id?: string | null;
          proposal_id?: string | null;
          invoice_number?: string;
          status?: InvoiceStatus;
          currency?: string;
          issued_at?: string | null;
          due_at?: string | null;
          subtotal?: number;
          vat?: number;
          total?: number;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "invoices_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "invoices_lead_id_fkey";
            columns: ["lead_id"];
            isOneToOne: false;
            referencedRelation: "leads";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "invoices_proposal_id_fkey";
            columns: ["proposal_id"];
            isOneToOne: false;
            referencedRelation: "proposals";
            referencedColumns: ["id"];
          },
        ];
      };
      invoice_items: {
        Row: {
          id: string;
          invoice_id: string;
          description: string;
          quantity: number;
          unit_price: number;
          amount: number;
          sort_order: number;
        };
        Insert: {
          id?: string;
          invoice_id: string;
          description: string;
          quantity?: number;
          unit_price?: number;
          amount?: number;
          sort_order?: number;
        };
        Update: {
          id?: string;
          invoice_id?: string;
          description?: string;
          quantity?: number;
          unit_price?: number;
          amount?: number;
          sort_order?: number;
        };
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey";
            columns: ["invoice_id"];
            isOneToOne: false;
            referencedRelation: "invoices";
            referencedColumns: ["id"];
          },
        ];
      };
      payment_plans: {
        Row: {
          id: string;
          client_id: string;
          invoice_id: string | null;
          name: string;
          status: PaymentPlanStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          client_id: string;
          invoice_id?: string | null;
          name: string;
          status?: PaymentPlanStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          client_id?: string;
          invoice_id?: string | null;
          name?: string;
          status?: PaymentPlanStatus;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "payment_plans_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payment_plans_invoice_id_fkey";
            columns: ["invoice_id"];
            isOneToOne: false;
            referencedRelation: "invoices";
            referencedColumns: ["id"];
          },
        ];
      };
      payment_plan_items: {
        Row: {
          id: string;
          plan_id: string;
          label: string;
          due_at: string | null;
          amount: number;
          status: PaymentPlanItemStatus;
          paid_at: string | null;
          sort_order: number;
        };
        Insert: {
          id?: string;
          plan_id: string;
          label: string;
          due_at?: string | null;
          amount?: number;
          status?: PaymentPlanItemStatus;
          paid_at?: string | null;
          sort_order?: number;
        };
        Update: {
          id?: string;
          plan_id?: string;
          label?: string;
          due_at?: string | null;
          amount?: number;
          status?: PaymentPlanItemStatus;
          paid_at?: string | null;
          sort_order?: number;
        };
        Relationships: [
          {
            foreignKeyName: "payment_plan_items_plan_id_fkey";
            columns: ["plan_id"];
            isOneToOne: false;
            referencedRelation: "payment_plans";
            referencedColumns: ["id"];
          },
        ];
      };
      receipts: {
        Row: {
          id: string;
          invoice_id: string;
          receipt_number: string;
          amount: number;
          currency: string;
          paid_at: string;
          payment_method: string | null;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          invoice_id: string;
          receipt_number: string;
          amount?: number;
          currency?: string;
          paid_at?: string;
          payment_method?: string | null;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          invoice_id?: string;
          receipt_number?: string;
          amount?: number;
          currency?: string;
          paid_at?: string;
          payment_method?: string | null;
          notes?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "receipts_invoice_id_fkey";
            columns: ["invoice_id"];
            isOneToOne: true;
            referencedRelation: "invoices";
            referencedColumns: ["id"];
          },
        ];
      };
      pipeline: {
        Row: {
          id: string;
          lead_id: string;
          stage: string;
          probability: number;
          deal_value: number | null;
          expected_close_date: string | null;
          notes: string | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          lead_id: string;
          stage: string;
          probability?: number;
          deal_value?: number | null;
          expected_close_date?: string | null;
          notes?: string | null;
          updated_at?: string;
        };
        Update: {
          id?: string;
          lead_id?: string;
          stage?: string;
          probability?: number;
          deal_value?: number | null;
          expected_close_date?: string | null;
          notes?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "pipeline_lead_id_fkey";
            columns: ["lead_id"];
            isOneToOne: true;
            referencedRelation: "leads";
            referencedColumns: ["id"];
          },
        ];
      };
      ai_insights: {
        Row: {
          id: string;
          type: AIInsightType | null;
          message: string;
          priority: AIInsightPriority;
          related_id: string | null;
          related_type: string | null;
          is_read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          type?: AIInsightType | null;
          message: string;
          priority?: AIInsightPriority;
          related_id?: string | null;
          related_type?: string | null;
          is_read?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          type?: AIInsightType | null;
          message?: string;
          priority?: AIInsightPriority;
          related_id?: string | null;
          related_type?: string | null;
          is_read?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      settings: {
        Row: {
          key: string;
          value: Json | null;
          updated_at: string;
        };
        Insert: {
          key: string;
          value?: Json | null;
          updated_at?: string;
        };
        Update: {
          key?: string;
          value?: Json | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      discovery_runs: {
        Row: {
          id: string;
          source: string;
          query_label: string | null;
          query: string | null;
          max_results: number | null;
          max_imports: number | null;
          attempted_count: number;
          created_count: number;
          skipped_count: number;
          created_ids: Json;
          skipped: Json;
          meta: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          source?: string;
          query_label?: string | null;
          query?: string | null;
          max_results?: number | null;
          max_imports?: number | null;
          attempted_count?: number;
          created_count?: number;
          skipped_count?: number;
          created_ids?: Json;
          skipped?: Json;
          meta?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          source?: string;
          query_label?: string | null;
          query?: string | null;
          max_results?: number | null;
          max_imports?: number | null;
          attempted_count?: number;
          created_count?: number;
          skipped_count?: number;
          created_ids?: Json;
          skipped?: Json;
          meta?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
export type TablesInsert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];
