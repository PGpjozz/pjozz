-- Proposal generator: document_json, discovery_json, share_token, acceptance tracking.
-- Run in Supabase SQL editor for existing databases.

ALTER TABLE public.proposals ADD COLUMN IF NOT EXISTS document_json JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.proposals ADD COLUMN IF NOT EXISTS discovery_json JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.proposals ADD COLUMN IF NOT EXISTS share_token TEXT UNIQUE;
ALTER TABLE public.proposals ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ;
ALTER TABLE public.proposals ADD COLUMN IF NOT EXISTS change_request_note TEXT;
ALTER TABLE public.proposals ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_proposals_lead_id ON public.proposals (lead_id);
CREATE INDEX IF NOT EXISTS idx_proposals_status ON public.proposals (status);
CREATE INDEX IF NOT EXISTS idx_proposals_share_token ON public.proposals (share_token) WHERE share_token IS NOT NULL;

DROP TRIGGER IF EXISTS proposals_touch_updated_at ON public.proposals;
CREATE TRIGGER proposals_touch_updated_at
  BEFORE UPDATE ON public.proposals
  FOR EACH ROW
  EXECUTE PROCEDURE public.touch_updated_at();
