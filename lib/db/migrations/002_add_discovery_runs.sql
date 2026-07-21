-- Add discovery run logging

CREATE TABLE IF NOT EXISTS public.discovery_runs (
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

CREATE INDEX IF NOT EXISTS idx_discovery_runs_created_at ON public.discovery_runs (created_at);

ALTER TABLE public.discovery_runs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'discovery_runs' AND policyname = 'discovery_runs_authenticated_all'
  ) THEN
    CREATE POLICY "discovery_runs_authenticated_all" ON public.discovery_runs
      FOR ALL TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END$$;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.discovery_runs TO authenticated;

