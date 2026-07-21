-- =============================================================================
-- Pjozz Technologies — CRM / automation schema (PostgreSQL / Supabase)
-- Run in Supabase SQL Editor or via migrations.
--
-- Fresh database: run this whole file once.
-- Existing database (tables already created): do NOT re-run from the top — use
-- lib/db/migrations/001_add_finance_tables.sql for incremental upgrades.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Tables
-- -----------------------------------------------------------------------------

CREATE TABLE public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  contact_name TEXT,
  email TEXT,
  phone TEXT,
  whatsapp TEXT,
  website TEXT,
  industry TEXT,
  service_type TEXT CHECK (
    service_type IS NULL
    OR service_type IN (
      'webapp',
      'mobileapp',
      'automation',
      'network',
      'security_cam',
      'software'
    )
  ),
  lead_score INTEGER NOT NULL DEFAULT 0 CHECK (lead_score BETWEEN 0 AND 100),
  status TEXT NOT NULL DEFAULT 'new' CHECK (
    status IN ('new', 'contacted', 'qualified', 'meeting', 'proposal', 'won', 'lost')
  ),
  source TEXT,
  enrichment_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  ai_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  type TEXT CHECK (
    type IS NULL
    OR type IN ('email', 'linkedin', 'whatsapp', 'multichannel')
  ),
  sequence JSONB NOT NULL DEFAULT '[]'::jsonb,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (
    status IN ('draft', 'active', 'paused', 'completed')
  ),
  leads_count INTEGER NOT NULL DEFAULT 0,
  sent_count INTEGER NOT NULL DEFAULT 0,
  opened_count INTEGER NOT NULL DEFAULT 0,
  replied_count INTEGER NOT NULL DEFAULT 0,
  open_rate DECIMAL(5, 2) NOT NULL DEFAULT 0,
  reply_rate DECIMAL(5, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.campaign_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns (id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES public.leads (id) ON DELETE CASCADE,
  current_step_index INTEGER NOT NULL DEFAULT 0 CHECK (current_step_index >= 0),
  status TEXT NOT NULL DEFAULT 'active' CHECK (
    status IN ('active', 'paused', 'replied', 'bounced', 'unsubscribed', 'completed')
  ),
  next_send_after TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT campaign_enrollments_campaign_lead_key UNIQUE (campaign_id, lead_id)
);

CREATE TABLE public.email_suppressions (
  email TEXT PRIMARY KEY,
  reason TEXT NOT NULL,
  source_campaign_id UUID REFERENCES public.campaigns (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.outreach_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES public.leads (id) ON DELETE SET NULL,
  campaign_id UUID REFERENCES public.campaigns (id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (
    type IN (
      'email_sent',
      'email_opened',
      'email_replied',
      'email_clicked',
      'email_bounced',
      'email_complained',
      'email_unsubscribed',
      'linkedin_connected',
      'whatsapp_sent',
      'whatsapp_replied',
      'meeting_booked',
      'proposal_accepted'
    )
  ),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES public.leads (id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  scope TEXT,
  deliverables JSONB NOT NULL DEFAULT '[]'::jsonb,
  timeline TEXT,
  pricing JSONB NOT NULL DEFAULT '{}'::jsonb,
  total_value DECIMAL(12, 2),
  currency TEXT NOT NULL DEFAULT 'ZAR',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (
    status IN ('draft', 'sent', 'accepted', 'rejected', 'expired')
  ),
  generated_by_ai BOOLEAN NOT NULL DEFAULT TRUE,
  sent_at TIMESTAMPTZ,
  -- Full structured proposal for editor + public view
  document_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Wizard: discovery notes meta, budget, timeline preference, etc.
  discovery_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Public read-only link token
  share_token TEXT UNIQUE,
  accepted_at TIMESTAMPTZ,
  change_request_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES public.leads (id) ON DELETE SET NULL,
  company_name TEXT NOT NULL,
  contact_name TEXT,
  email TEXT,
  phone TEXT,
  retainer_active BOOLEAN NOT NULL DEFAULT FALSE,
  retainer_amount DECIMAL(12, 2),
  total_revenue DECIMAL(12, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.pipeline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads (id) ON DELETE CASCADE,
  stage TEXT NOT NULL,
  probability INTEGER NOT NULL DEFAULT 0,
  deal_value DECIMAL(12, 2),
  expected_close_date DATE,
  notes TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT pipeline_lead_id_key UNIQUE (lead_id)
);

CREATE TABLE public.ai_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT CHECK (
    type IS NULL
    OR type IN ('action_required', 'warning', 'opportunity', 'daily_brief')
  ),
  message TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (
    priority IN ('low', 'medium', 'high', 'critical')
  ),
  related_id UUID,
  related_type TEXT,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.settings (
  key TEXT PRIMARY KEY,
  value JSONB,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.discovery_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL DEFAULT 'web_discovery_auto',
  query_label TEXT,
  query TEXT,
  max_results INTEGER,
  max_imports INTEGER,
  attempted_count INTEGER NOT NULL DEFAULT 0,
  created_count INTEGER NOT NULL DEFAULT 0,
  skipped_count INTEGER NOT NULL DEFAULT 0,
  created_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  skipped JSONB NOT NULL DEFAULT '[]'::jsonb,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- Finance
-- -----------------------------------------------------------------------------

CREATE TABLE public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients (id) ON DELETE CASCADE,
  lead_id UUID REFERENCES public.leads (id) ON DELETE SET NULL,
  proposal_id UUID REFERENCES public.proposals (id) ON DELETE SET NULL,
  invoice_number TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'void')),
  currency TEXT NOT NULL DEFAULT 'ZAR',
  issued_at TIMESTAMPTZ,
  due_at TIMESTAMPTZ,
  subtotal DECIMAL(12, 2) NOT NULL DEFAULT 0,
  vat DECIMAL(12, 2) NOT NULL DEFAULT 0,
  total DECIMAL(12, 2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.invoices (id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity DECIMAL(12, 2) NOT NULL DEFAULT 1,
  unit_price DECIMAL(12, 2) NOT NULL DEFAULT 0,
  amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE public.payment_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients (id) ON DELETE CASCADE,
  invoice_id UUID REFERENCES public.invoices (id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.payment_plan_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES public.payment_plans (id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  due_at TIMESTAMPTZ,
  amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'due' CHECK (status IN ('due', 'paid', 'void')),
  paid_at TIMESTAMPTZ,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE public.receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL UNIQUE REFERENCES public.invoices (id) ON DELETE CASCADE,
  receipt_number TEXT NOT NULL UNIQUE,
  amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'ZAR',
  paid_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  payment_method TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- Indexes
-- -----------------------------------------------------------------------------

CREATE INDEX idx_leads_status ON public.leads (status);
CREATE INDEX idx_leads_lead_score ON public.leads (lead_score);
CREATE INDEX idx_leads_service_type ON public.leads (service_type);
CREATE INDEX idx_outreach_events_lead_id ON public.outreach_events (lead_id);
CREATE INDEX idx_outreach_events_campaign_id ON public.outreach_events (campaign_id);
CREATE INDEX idx_outreach_events_type_created ON public.outreach_events (type, created_at);
CREATE INDEX idx_campaign_enrollments_campaign ON public.campaign_enrollments (campaign_id);
CREATE INDEX idx_campaign_enrollments_lead ON public.campaign_enrollments (lead_id);
CREATE INDEX idx_campaign_enrollments_next_send ON public.campaign_enrollments (campaign_id, status, next_send_after);
CREATE INDEX idx_pipeline_stage ON public.pipeline (stage);
CREATE INDEX idx_proposals_lead_id ON public.proposals (lead_id);
CREATE INDEX idx_proposals_status ON public.proposals (status);
CREATE INDEX idx_proposals_share_token ON public.proposals (share_token) WHERE share_token IS NOT NULL;
CREATE INDEX idx_invoices_client_id ON public.invoices (client_id);
CREATE INDEX idx_invoices_status_due ON public.invoices (status, due_at);
CREATE INDEX idx_invoice_items_invoice_id ON public.invoice_items (invoice_id);
CREATE INDEX idx_payment_plans_client_id ON public.payment_plans (client_id);
CREATE INDEX idx_payment_plan_items_plan_id ON public.payment_plan_items (plan_id);
CREATE INDEX idx_receipts_invoice_id ON public.receipts (invoice_id);
CREATE INDEX idx_receipts_created_at ON public.receipts (created_at);
CREATE INDEX idx_discovery_runs_created_at ON public.discovery_runs (created_at);

-- -----------------------------------------------------------------------------
-- updated_at trigger
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER leads_touch_updated_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_updated_at();

CREATE TRIGGER pipeline_touch_updated_at
  BEFORE UPDATE ON public.pipeline
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_updated_at();

CREATE TRIGGER campaigns_touch_updated_at
  BEFORE UPDATE ON public.campaigns
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_updated_at();

CREATE TRIGGER campaign_enrollments_touch_updated_at
  BEFORE UPDATE ON public.campaign_enrollments
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_updated_at();

CREATE TRIGGER proposals_touch_updated_at
  BEFORE UPDATE ON public.proposals
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_updated_at();

CREATE TRIGGER settings_touch_updated_at
  BEFORE UPDATE ON public.settings
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_updated_at();

CREATE TRIGGER invoices_touch_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_updated_at();

CREATE TRIGGER payment_plans_touch_updated_at
  BEFORE UPDATE ON public.payment_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_updated_at();

-- -----------------------------------------------------------------------------
-- Row Level Security — authenticated role only
-- -----------------------------------------------------------------------------

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_suppressions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outreach_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pipeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_plan_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discovery_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "leads_authenticated_all" ON public.leads
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "campaigns_authenticated_all" ON public.campaigns
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "campaign_enrollments_authenticated_all" ON public.campaign_enrollments
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "email_suppressions_authenticated_all" ON public.email_suppressions
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "outreach_events_authenticated_all" ON public.outreach_events
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "proposals_authenticated_all" ON public.proposals
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "clients_authenticated_all" ON public.clients
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "pipeline_authenticated_all" ON public.pipeline
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "ai_insights_authenticated_all" ON public.ai_insights
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "settings_authenticated_all" ON public.settings
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "invoices_authenticated_all" ON public.invoices
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "invoice_items_authenticated_all" ON public.invoice_items
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "payment_plans_authenticated_all" ON public.payment_plans
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "payment_plan_items_authenticated_all" ON public.payment_plan_items
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "receipts_authenticated_all" ON public.receipts
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "discovery_runs_authenticated_all" ON public.discovery_runs
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- -----------------------------------------------------------------------------
-- Grants (RLS still applies to authenticated; service_role bypasses RLS)
-- -----------------------------------------------------------------------------

GRANT USAGE ON SCHEMA public TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.leads TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaigns TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaign_enrollments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_suppressions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.outreach_events TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.proposals TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clients TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pipeline TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_insights TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.settings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoices TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoice_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payment_plans TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payment_plan_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.receipts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.discovery_runs TO authenticated;
