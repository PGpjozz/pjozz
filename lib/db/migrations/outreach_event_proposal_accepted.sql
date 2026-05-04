-- Add proposal_accepted to outreach_events for operator activity feed.
-- Run after base schema.

ALTER TABLE public.outreach_events DROP CONSTRAINT IF EXISTS outreach_events_type_check;

ALTER TABLE public.outreach_events
  ADD CONSTRAINT outreach_events_type_check CHECK (
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
  );

-- Optional: expose inserts to Realtime (enable in Supabase Dashboard → Database → Replication).
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.outreach_events;
