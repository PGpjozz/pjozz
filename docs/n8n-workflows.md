# n8n workflows for Pjozz Technologies

Self-hosted n8n base URL: set `N8N_BASE_URL` (default `http://localhost:5678`).  
Automation calls **into** Pjozz use `N8N_INBOUND_SECRET` (or `OUTREACH_CRON_SECRET`) as:

- `Authorization: Bearer <secret>` **or**
- `x-pjozz-automation-secret: <secret>`

Replace `APP_URL` with your public app origin (same as `NEXT_PUBLIC_APP_URL`).

---

## WORKFLOW 1 — Lead scraper (daily 7:00 SAST)

**Goal:** Pull net-new companies from Apollo (South Africa), skip CRM duplicates, create leads + AI scoring via Pjozz.

1. **Trigger:** Schedule — cron `0 7 * * *` with timezone **Africa/Johannesburg** (7:00 SAST daily).
2. **HTTP Request — Apollo search**  
   - Method: `GET` or `POST` per Apollo docs.  
   - Query: industry + `locations[]=South Africa` (or Apollo location IDs you use).  
   - Auth: Apollo API key header.
3. **Split out items** (e.g. `items` array from Apollo response).
4. **Loop** over each company:
   - Map to `email` (required), `companyName`, `contactName`, `website`, `industry`, etc.
   - **HTTP Request — check duplicate**  
     `GET {APP_URL}/api/leads/check-exists?email={{$json.email}}`  
     Headers: `Authorization: Bearer {{$env.N8N_INBOUND_SECRET}}`
   - **IF** `response.exists === true` → **Continue** (skip).
   - **HTTP Request — create lead**  
     `POST {APP_URL}/api/webhooks/n8n`  
     Headers:  
     `Authorization: Bearer {{$env.N8N_INBOUND_SECRET}}`  
     `Content-Type: application/json`  
     Body:
     ```json
     {
       "type": "lead_scraped",
       "lead": {
         "companyName": "Acme Pty Ltd",
         "email": "hello@acme.co.za",
         "contactName": "Jane Doe",
         "phone": "+27…",
         "website": "https://acme.co.za",
         "industry": "Retail",
         "serviceType": "webapp",
         "notes": "Apollo list ID …"
       }
     }
     ```
5. **Aggregate** count of successful creates in the loop.
6. **Slack** (or n8n Slack node): message `X new leads added today` (use loop counter / summary).

**Notes**

- `serviceType` must be one of: `webapp`, `mobileapp`, `automation`, `network`, `security_cam`, `software`.
- Pjozz runs AI scoring after insert; failures are non-fatal.

---

## WORKFLOW 1B — Web discovery (Google CSE) auto-import (daily / hourly)

**Goal:** Let Pjozz itself discover leads online (via Google Programmable Search), extract contact emails from websites, dedupe, then create leads automatically.

### Prereqs (env vars in the app)

- `GOOGLE_CSE_API_KEY`
- `GOOGLE_CSE_CX`
- `N8N_INBOUND_SECRET` (or `OUTREACH_CRON_SECRET`) to protect the endpoint

### n8n workflow

1. **Trigger:** Schedule (e.g. daily 06:45 SAST or hourly in business hours)
2. **HTTP Request — run discovery**
   - Method: `POST`
   - URL: `{APP_URL}/api/automation/discovery/run`
   - Headers:
     - `Authorization: Bearer {{$env.N8N_INBOUND_SECRET}}`
     - `Content-Type: application/json`
   - Body example:

```json
{
  "presetLabel": "Tech startups (ZA)",
  "serviceTypes": ["webapp", "software", "automation"],
  "expand": true,
  "maxPresetVariants": 15,
  "totalMaxResults": 30,
  "pageSize": 10,
  "maxPages": 5,
  "throttleMs": 250,
  "maxPerQueryDomain": 10,
  "maxImports": 10,
  "dryRun": false
}
```

3. **Optional**: Send a Slack summary with `createdCount` + top skipped reasons.

**Notes**

- This writes a log row to `discovery_runs` (Supabase) for each run (best-effort).
- Use `dryRun: true` first to validate queries without inserting.
- If you want maximum volume, increase `totalMaxResults`, `maxPages`, and run more often — but watch Google CSE quotas.

---

## WORKFLOW 2 — Email sequence processor (hourly, Mon–Fri 8:00–17:00 SAST)

**Goal:** Drive campaign sends during business hours.

1. **Trigger:** Schedule — hourly, limited to weekdays and window (or single hourly + **IF** node with weekday + hour checks in SAST).
2. **HTTP Request — list pending campaigns**  
   `GET {APP_URL}/api/campaigns/pending-sends`  
   Headers: `Authorization: Bearer {{$env.N8N_INBOUND_SECRET}}`  
   Response: `{ "ok": true, "data": { "campaigns": [{ "id": "uuid" }, …] } }`
3. **Loop** `data.campaigns`:
   - **HTTP Request — send next**  
     `POST {APP_URL}/api/campaigns/{{$json.id}}/send-next`  
     Headers: `Authorization: Bearer {{$env.OUTREACH_CRON_SECRET}}` **or** same as inbound if you unified on `N8N_INBOUND_SECRET` (Pjozz accepts `OUTREACH_CRON_SECRET` **or** `N8N_INBOUND_SECRET` on this route).
4. Log `sent` / `skipped` from JSON for observability.

**Notes**

- Resend inbound replies are still handled by `POST /api/webhooks/email`; this workflow only advances sequences.
- `send-next` enforces send window + daily cap server-side.

---

## WORKFLOW 3 — Calendly → meeting booked

**Goal:** Calendly hits n8n; n8n resolves lead and notifies Pjozz CRM + team email.

1. **Trigger:** Webhook (production URL from Calendly “Webhook subscription” or manual copy).
2. **Function** (or Set node): extract **invitee email** from Calendly JSON (`payload.email` / `invitee.email` depending on Calendly version — inspect one real payload).
3. **HTTP Request — resolve lead**  
   `GET {APP_URL}/api/leads/by-email?email={{$json.email}}`  
   Headers: `Authorization: Bearer {{$env.N8N_INBOUND_SECRET}}`
4. **IF** 404 → optional branch: create placeholder lead or alert Slack “unknown invitee”.
5. **HTTP Request — CRM update**  
   `POST {APP_URL}/api/webhooks/n8n`  
   Body:
   ```json
   {
     "type": "meeting_booked",
     "leadId": "{{$json.data.lead.id}}",
     "email": "{{$json.email}}",
     "calendlyPayload": {{$json}}
   }
   ```
   (Pass `leadId` from step 3 when found; `email` is optional if `leadId` is set.)
6. **HTTP Request — Resend** (or SMTP): email Pjozz team “Meeting booked with …” including invitee + event time from Calendly payload.

---

## WORKFLOW 4 — Daily AI brief (6:30 SAST)

**Goal:** Refresh brief, email team, WhatsApp owner summary.

1. **Trigger:** Schedule — `30 6 * * *` in **Africa/Johannesburg**.
2. **HTTP Request — generate brief**  
   `GET {APP_URL}/api/ai/daily-brief`  
   (No auth on this route today; protect with firewall / future API key if exposed.)
3. **Function:** build HTML email from `data.summary`, `data.alerts`, `data.topActions`, `data.forecastNote`.
4. **Resend node** (or HTTP to Resend API): send to `PJozZ_TEAM_EMAIL` / ops distro.
5. **Twilio** (WhatsApp or SMS): message owner with **max 3 bullets** from `topActions` + one-line forecast from `forecastNote`. Use the same Twilio account / `TWILIO_WHATSAPP_FROM` as Pjozz (see `docs/whatsapp-twilio.md`) or a dedicated n8n credential.

**Notes**

- Twilio: same env vars as the app (`TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_FROM`). Inbound CRM replies still hit **`POST /api/webhooks/whatsapp`** on Pjozz.

---

## Outbound: Pjozz → n8n

Use `triggerWebhook(webhookId, data)` from `@/lib/automation/n8n.ts` in app code. Webhook IDs live in `N8N_WEBHOOK_IDS`; create matching **Webhook** triggers in n8n and paste the path segment into those constants.
