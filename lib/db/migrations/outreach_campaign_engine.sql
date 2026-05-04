-- Outreach Campaign Engine — apply to existing Supabase DBs (idempotent where possible).
-- New installs: use lib/db/schema.sql instead.

ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS settings JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS opened_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS replied_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE public.campaigns DROP CONSTRAINT IF EXISTS campaigns_type_check;
ALTER TABLE public.campaigns ADD CONSTRAINT campaigns_type_check CHECK (
  type IS NULL OR type IN ('email', 'linkedin', 'whatsapp', 'multichannel')
);

CREATE TABLE IF NOT EXISTS public.campaign_enrollments (
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

CREATE TABLE IF NOT EXISTS public.email_suppressions (
  email TEXT PRIMARY KEY,
  reason TEXT NOT NULL,
  source_campaign_id UUID REFERENCES public.campaigns (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.outreach_events DROP CONSTRAINT IF EXISTS outreach_events_type_check;
ALTER TABLE public.outreach_events ADD CONSTRAINT outreach_events_type_check CHECK (
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
    'meeting_booked'
  )
);

CREATE INDEX IF NOT EXISTS idx_outreach_events_campaign_id ON public.outreach_events (campaign_id);
CREATE INDEX IF NOT EXISTS idx_outreach_events_type_created ON public.outreach_events (type, created_at);
CREATE INDEX IF NOT EXISTS idx_campaign_enrollments_campaign ON public.campaign_enrollments (campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_enrollments_lead ON public.campaign_enrollments (lead_id);
CREATE INDEX IF NOT EXISTS idx_campaign_enrollments_next_send ON public.campaign_enrollments (campaign_id, status, next_send_after);

ALTER TABLE public.campaign_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_suppressions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'campaign_enrollments_authenticated_all'
  ) THEN
    CREATE POLICY "campaign_enrollments_authenticated_all" ON public.campaign_enrollments
      FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'email_suppressions_authenticated_all'
  ) THEN
    CREATE POLICY "email_suppressions_authenticated_all" ON public.email_suppressions
      FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaign_enrollments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_suppressions TO authenticated;

DROP TRIGGER IF EXISTS campaigns_touch_updated_at ON public.campaigns;
CREATE TRIGGER campaigns_touch_updated_at
  BEFORE UPDATE ON public.campaigns
  FOR EACH ROW
  EXECUTE PROCEDURE public.touch_updated_at();

DROP TRIGGER IF EXISTS campaign_enrollments_touch_updated_at ON public.campaign_enrollments;
CREATE TRIGGER campaign_enrollments_touch_updated_at
  BEFORE UPDATE ON public.campaign_enrollments
  FOR EACH ROW
  EXECUTE PROCEDURE public.touch_updated_at();
