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

## Sales workflow

1. **Lead** — `/leads` → Add lead (or Discover)
2. **Proposal** — Lead detail → “Open proposal wizard”, or `/proposals/new`
3. **Quote PDF** — From proposal list/wizard → Quote PDF (pricing view)
4. **Send** — Wizard step 5 emails a public share link (`/p/[token]`)
5. **Accept** — Client accepts → creates **Client**, marks lead **won**, drafts **Invoice**
6. **Invoice PDF** — `/billing/invoices/[id]` → Invoice PDF
7. **Receipt PDF** — Mark invoice **paid** → Receipt PDF

Apply `lib/db/migrations/003_add_receipts.sql` in Supabase for receipts.
