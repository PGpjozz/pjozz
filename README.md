# Pjozz Technologies

Internal CRM + marketing site for Pjozz Technologies (South African SMB services): leads, pipeline, outreach campaigns, AI proposals, billing.

## Stack

- Next.js 14 (App Router) + TypeScript + Tailwind
- Supabase (Postgres) via service-role server client
- Anthropic Claude, Resend email, optional Twilio WhatsApp + n8n

## Setup

1. `npm install`
2. Copy `.env.example` → `.env.local` and fill keys (Supabase, Anthropic, Resend, Google CSE for discovery).
3. Apply SQL in Supabase:
   - Fresh project: run `lib/db/schema.sql`
   - Existing DB: apply files under `lib/db/migrations/` in order (including `002_add_discovery_runs.sql`)
4. `npm run dev` → http://localhost:3000

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm run start` | Run production build |
| `npm run lint` | ESLint |

## Operator app

CRM routes live under `/dashboard`, `/leads`, `/pipeline`, `/outreach`, `/proposals`, `/clients`, `/billing`, `/settings`.

Automation callers (n8n/cron) should send `Authorization: Bearer <N8N_INBOUND_SECRET>` (or `OUTREACH_CRON_SECRET`). In production a secret is required.

See `docs/n8n-workflows.md` and `docs/whatsapp-twilio.md` for integration details.
