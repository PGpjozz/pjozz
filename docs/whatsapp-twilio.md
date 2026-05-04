# WhatsApp (Twilio) integration

Pjozz sends **session WhatsApp messages** via Twilio’s REST API and receives **inbound replies** on a webhook.

## Environment variables

| Variable | Purpose |
|----------|---------|
| `TWILIO_ACCOUNT_SID` | Account SID |
| `TWILIO_AUTH_TOKEN` | Auth token (keep server-only) |
| `TWILIO_WHATSAPP_FROM` | Your approved WhatsApp sender, e.g. `whatsapp:+14155238886` (sandbox) or production `whatsapp:+27…` |
| `TWILIO_WEBHOOK_PUBLIC_URL` | **Exact** public URL prefix Twilio calls (no trailing slash). Use when reverse proxies change host vs `NEXT_PUBLIC_APP_URL`. |
| `TWILIO_VALIDATE_WEBHOOK` | Set to `1` in production to enforce `X-Twilio-Signature` validation on `POST /api/webhooks/whatsapp`. |

Optional:

- `NEXT_PUBLIC_APP_URL` — used to build the default webhook URL if `TWILIO_WEBHOOK_PUBLIC_URL` is unset.

## Outbound

1. **Campaign sequences** — When a step uses channel `whatsapp`, `runCampaignSendNext` sends the step body (HTML stripped to text) to the lead’s **`whatsapp`** or **`phone`** field via `sendWhatsAppMessage`.
2. **Manual send** — `POST /api/leads/{id}/send-whatsapp` with JSON `{ "message": "…" }` and optional `{ "to": "+2782…" }` if the lead record has no number on file.

## Inbound

Configure Twilio **WhatsApp** inbound webhook to:

`{YOUR_PUBLIC_ORIGIN}/api/webhooks/whatsapp`

- **GET** — plain text ping (useful for sanity checks).
- **POST** — Twilio `application/x-www-form-urlencoded` payload (`From`, `To`, `Body`, `MessageSid`).

On each inbound message Pjozz:

1. Logs **`outreach_events`** with type **`whatsapp_replied`**.
2. Tries to match **`From`** to a lead (`phone` / `whatsapp`, fuzzy on trailing digits).
3. If matched: pauses **active** enrollments where **`pauseOnReply`** is enabled (same idea as email replies) and inserts a high-priority **`ai_insights`** row.

## Twilio Console checklist

1. Activate **WhatsApp** on your Twilio number (or join the sandbox).
2. Set **When a message comes in** → Webhook → `POST` → your `/api/webhooks/whatsapp` URL.
3. For production, set **`TWILIO_VALIDATE_WEBHOOK=1`** and ensure **`TWILIO_WEBHOOK_PUBLIC_URL`** matches the URL Twilio signs (often your stable HTTPS hostname).

## Notes

- This integration uses **plain text** messages, not WhatsApp **template** messages. For marketing cold-outreach outside the 24h window, add template support separately.
- South Africa numbers: store `whatsapp` or `phone` with country code (`+27…`) for best match quality.
