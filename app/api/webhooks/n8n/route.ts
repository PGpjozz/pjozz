import { NextResponse } from "next/server";
import { z } from "zod";

import { assertAutomationInbound } from "@/lib/automation/auth";
import {
  handleCampaignStepDue,
  handleEmailReplyDetected,
  handleLeadScraped,
  handleMeetingBooked,
} from "@/lib/automation/n8n-handlers";

export const dynamic = "force-dynamic";

const serviceType = z.enum(["webapp", "mobileapp", "automation", "network", "security_cam", "software"]);

const leadScraped = z.object({
  type: z.literal("lead_scraped"),
  lead: z.object({
    companyName: z.string().min(1),
    email: z.string().email(),
    contactName: z.string().optional().nullable(),
    phone: z.string().optional().nullable(),
    website: z.string().optional().nullable(),
    industry: z.string().optional().nullable(),
    serviceType: serviceType.optional().nullable(),
    notes: z.string().optional().nullable(),
  }),
});

const emailReplyDetected = z.object({
  type: z.literal("email_reply_detected"),
  email: z.string().email(),
  leadId: z.string().uuid().optional().nullable(),
  campaignId: z.string().uuid().optional().nullable(),
  enrollmentId: z.string().uuid().optional().nullable(),
  subject: z.string().optional().nullable(),
  snippet: z.string().optional().nullable(),
});

const meetingBooked = z.object({
  type: z.literal("meeting_booked"),
  leadId: z.string().uuid().optional().nullable(),
  email: z.string().email().optional().nullable(),
  calendlyPayload: z.unknown().optional(),
});

const campaignStepDue = z.object({
  type: z.literal("campaign_step_due"),
  campaignId: z.string().uuid(),
});

const bodySchema = z.discriminatedUnion("type", [leadScraped, emailReplyDetected, meetingBooked, campaignStepDue]);

export async function POST(req: Request) {
  try {
    assertAutomationInbound(req);
    let json: unknown;
    try {
      json = await req.json();
    } catch {
      return NextResponse.json({ ok: false as const, error: "Invalid JSON" }, { status: 400 });
    }

    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false as const, error: "Invalid payload", issues: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const p = parsed.data;
    if (p.type === "lead_scraped") {
      const data = await handleLeadScraped(p.lead);
      return NextResponse.json({ ok: true as const, data });
    }
    if (p.type === "email_reply_detected") {
      await handleEmailReplyDetected({
        email: p.email,
        leadId: p.leadId,
        campaignId: p.campaignId,
        enrollmentId: p.enrollmentId,
        subject: p.subject,
        snippet: p.snippet,
      });
      return NextResponse.json({ ok: true as const, data: { handled: "email_reply_detected" } });
    }
    if (p.type === "meeting_booked") {
      const data = await handleMeetingBooked({
        leadId: p.leadId,
        email: p.email,
        calendlyPayload: p.calendlyPayload,
      });
      return NextResponse.json({ ok: true as const, data });
    }
    const data = await handleCampaignStepDue({ campaignId: p.campaignId });
    return NextResponse.json({ ok: true as const, data });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server error";
    const status = msg === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ ok: false as const, error: msg }, { status });
  }
}
