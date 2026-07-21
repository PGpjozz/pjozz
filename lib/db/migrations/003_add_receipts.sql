-- Add receipts for paid invoices

CREATE TABLE IF NOT EXISTS public.receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.invoices (id) ON DELETE CASCADE,
  receipt_number TEXT NOT NULL UNIQUE,
  amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'ZAR',
  paid_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  payment_method TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT receipts_invoice_unique UNIQUE (invoice_id)
);

CREATE INDEX IF NOT EXISTS idx_receipts_invoice_id ON public.receipts (invoice_id);
CREATE INDEX IF NOT EXISTS idx_receipts_created_at ON public.receipts (created_at);

ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'receipts' AND policyname = 'receipts_authenticated_all'
  ) THEN
    CREATE POLICY "receipts_authenticated_all" ON public.receipts
      FOR ALL TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END$$;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.receipts TO authenticated;
