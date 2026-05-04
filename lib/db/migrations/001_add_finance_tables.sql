-- =============================================================================
-- Migration: finance tables (idempotent)
-- =============================================================================
-- Use this when your database already has leads/campaigns/etc. from an earlier
-- run of schema.sql. Re-running the full schema.sql fails on "already exists"
-- and never reaches the finance section.
--
-- Safe to run multiple times.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Tables
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.invoices (
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

CREATE TABLE IF NOT EXISTS public.invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.invoices (id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity DECIMAL(12, 2) NOT NULL DEFAULT 1,
  unit_price DECIMAL(12, 2) NOT NULL DEFAULT 0,
  amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.payment_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients (id) ON DELETE CASCADE,
  invoice_id UUID REFERENCES public.invoices (id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.payment_plan_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES public.payment_plans (id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  due_at TIMESTAMPTZ,
  amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'due' CHECK (status IN ('due', 'paid', 'void')),
  paid_at TIMESTAMPTZ,
  sort_order INTEGER NOT NULL DEFAULT 0
);

-- -----------------------------------------------------------------------------
-- Indexes
-- -----------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON public.invoices (client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status_due ON public.invoices (status, due_at);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON public.invoice_items (invoice_id);
CREATE INDEX IF NOT EXISTS idx_payment_plans_client_id ON public.payment_plans (client_id);
CREATE INDEX IF NOT EXISTS idx_payment_plan_items_plan_id ON public.payment_plan_items (plan_id);

-- -----------------------------------------------------------------------------
-- updated_at triggers (function may already exist from main schema)
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

DROP TRIGGER IF EXISTS invoices_touch_updated_at ON public.invoices;
CREATE TRIGGER invoices_touch_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS payment_plans_touch_updated_at ON public.payment_plans;
CREATE TRIGGER payment_plans_touch_updated_at
  BEFORE UPDATE ON public.payment_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_updated_at();

-- -----------------------------------------------------------------------------
-- Row Level Security
-- -----------------------------------------------------------------------------

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_plan_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "invoices_authenticated_all" ON public.invoices;
CREATE POLICY "invoices_authenticated_all" ON public.invoices
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "invoice_items_authenticated_all" ON public.invoice_items;
CREATE POLICY "invoice_items_authenticated_all" ON public.invoice_items
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "payment_plans_authenticated_all" ON public.payment_plans;
CREATE POLICY "payment_plans_authenticated_all" ON public.payment_plans
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "payment_plan_items_authenticated_all" ON public.payment_plan_items;
CREATE POLICY "payment_plan_items_authenticated_all" ON public.payment_plan_items
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- -----------------------------------------------------------------------------
-- Grants (service_role bypasses RLS)
-- -----------------------------------------------------------------------------

GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoices TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoice_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payment_plans TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payment_plan_items TO authenticated;
