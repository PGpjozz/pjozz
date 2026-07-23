# Pjozz Technologies

Internal CRM + marketing site for Pjozz Technologies (South African SMB services): leads, pipeline, outreach campaigns, AI proposals, billing.

## Stack

- Next.js 14 (App Router) + TypeScript + Tailwind
- Supabase (Postgres) via service-role server client
- Anthropic Claude, Resend email, optional Twilio WhatsApp + n8n

## Setup (local)

1. `npm install`
2. Copy `.env.example` → `.env.local` and fill keys (Supabase, Anthropic, Resend, Google CSE for discovery).
3. Apply SQL in Supabase:
   - Fresh project: run `lib/db/schema.sql`
   - Existing DB: apply files under `lib/db/migrations/` in order (including `002_add_discovery_runs.sql`)
4. `npm run dev` → http://localhost:3000  
   After a production `npm run build`, prefer `npm run dev:clean` so stale `.next` chunks don't 404.

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Dev server |
| `npm run dev:clean` | Wipe `.next` then start dev |
| `npm run build` | Production build |
| `npm run start` | Run production build |
| `npm run lint` | ESLint |

## Go live (Vercel / production)

Code on `main` is production-ready (`npm run build` must pass). Wire the host as follows:

1. **Connect the repo** to Vercel (or similar) with root directory = this project.
2. **Domain** — attach `pjozz.co.za` (and `www` if needed) and wait for DNS.
3. **Environment variables** — copy from `.env.example` into the host. Minimum for a working live site:

| Variable | Production value |
|----------|------------------|
| `NEXT_PUBLIC_APP_URL` | `https://pjozz.co.za` |
| `NEXT_PUBLIC_SITE_URL` | `https://pjozz.co.za` |
| `NEXT_PUBLIC_HELLO_EMAIL` | `pgpjoz@gmail.com` |
| `NEXT_PUBLIC_PHONE_TEL` | `tel:+27751668800` |
| `NEXT_PUBLIC_WHATSAPP_E164` | `27751668800` |
| `OPS_NOTIFY_EMAIL` | `pgpjoz@gmail.com` |
| `ADMIN_PASSWORD` | **strong unique password** (not the local default) |
| `ADMIN_SESSION_SECRET` | fresh 32-byte secret (`node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`) |
| `NEXT_PUBLIC_SUPABASE_URL` / `ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` | from Supabase |
| `RESEND_API_KEY` / `RESEND_FROM_EMAIL` | Resend — **verify `pjozz.co.za`** and send as `Pjozz <hello@pjozz.co.za>` (not `onboarding@resend.dev`) |
| `ANTHROPIC_API_KEY` | if AI features are on |

4. **Redeploy** after saving env vars (`NEXT_PUBLIC_*` only apply on new builds).
5. **Smoke test**
   - `/` loads, contact shows email/phone/WhatsApp
   - `/contact` + quote form submit → lead in CRM + email to `OPS_NOTIFY_EMAIL`
   - `/login` with `ADMIN_PASSWORD` → `/dashboard`
   - Send a proposal → open `/p/<token>` → PDF download + accept works

## Sales workflow

1. **Lead** — `/leads` → Add lead (or Discover)
2. **Proposal** — Lead detail → “Open proposal wizard”, or `/proposals/new`
3. **Quote PDF** — From proposal list/wizard → Quote PDF (pricing view)
4. **Send** — Wizard step 5 emails a public share link (`/p/[token]`)
5. **Accept** — Client accepts → creates **Client**, marks lead **won**, drafts **Invoice**
6. **Invoice PDF** — `/billing/invoices/[id]` → Invoice PDF
7. **Receipt PDF** — Mark invoice **paid** → Receipt PDF

Apply `lib/db/migrations/003_add_receipts.sql` in Supabase for receipts.
