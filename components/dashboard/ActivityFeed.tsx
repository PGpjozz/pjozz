"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CalendarCheck,
  CheckCircle2,
  Mail,
  MailOpen,
  MessageCircle,
  MessageCircleReply,
  MousePointerClick,
  Send,
} from "lucide-react";

import type { ActivityRow } from "@/lib/dashboard/activity-types";
import { getBrowserSupabase, type TypedSupabaseClient } from "@/lib/db/supabase";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { cn } from "@/lib/utils";

function timeAgo(iso: string): string {
  const sec = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (sec < 10) return "just now";
  if (sec < 60) return `${sec}s ago`;
  const m = Math.floor(sec / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function eventIcon(type: string) {
  switch (type) {
    case "email_opened":
      return MailOpen;
    case "email_replied":
      return MessageCircleReply;
    case "email_sent":
      return Send;
    case "email_clicked":
      return MousePointerClick;
    case "meeting_booked":
      return CalendarCheck;
    case "proposal_accepted":
      return CheckCircle2;
    case "whatsapp_sent":
    case "whatsapp_replied":
      return MessageCircle;
    default:
      return Mail;
  }
}

function describeEvent(e: ActivityRow): string {
  const company = e.lead_company ?? "Unknown lead";
  switch (e.type) {
    case "email_sent":
      return `Email sent · ${company}`;
    case "email_opened":
      return `Email opened · ${company}`;
    case "email_replied":
      return `Reply received · ${company}`;
    case "email_clicked":
      return `Link clicked · ${company}`;
    case "meeting_booked":
      return `Meeting booked · ${company}`;
    case "proposal_accepted":
      return `Proposal accepted · ${company}`;
    case "whatsapp_sent":
      return `WhatsApp sent · ${company}`;
    case "whatsapp_replied":
      return `WhatsApp reply · ${company}`;
    default:
      return `${e.type.replace(/_/g, " ")} · ${company}`;
  }
}

export function ActivityFeed({ className }: { className?: string }) {
  const [events, setEvents] = useState<ActivityRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const res = await fetch("/api/dashboard/activity");
    const json = (await res.json()) as { ok: boolean; data?: { events: ActivityRow[] } };
    if (json.ok && json.data) setEvents(json.data.events);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const poll = window.setInterval(() => void load(), 20_000);
    return () => window.clearInterval(poll);
  }, [load]);

  useEffect(() => {
    let supabase: TypedSupabaseClient | null = null;
    let channel: RealtimeChannel | null = null;
    try {
      supabase = getBrowserSupabase();
      channel = supabase
        .channel("outreach_events_dashboard")
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "outreach_events" },
          () => {
            void load();
          }
        )
        .subscribe();
    } catch {
      /* missing env or RLS: polling still updates */
    }
    return () => {
      if (supabase && channel) void supabase.removeChannel(channel);
    };
  }, [load]);

  return (
    <section className={cn("rounded-xl border border-border bg-card/30 p-4", className)}>
      <h3 className="mb-3 font-heading text-sm font-semibold text-foreground">Activity</h3>
      {loading ? (
        <ul className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <li key={i} className="flex gap-3">
              <div className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-muted" />
              <div className="flex-1 space-y-2">
                <div className="h-3 max-w-md flex-1 animate-pulse rounded bg-muted" />
                <div className="h-2 w-24 animate-pulse rounded bg-muted" />
              </div>
            </li>
          ))}
        </ul>
      ) : events.length === 0 ? (
        <p className="text-sm text-muted-foreground">No outreach events yet.</p>
      ) : (
        <ul className="max-h-[420px] space-y-3 overflow-y-auto pr-1">
          {events.map((e) => {
            const Icon = eventIcon(e.type);
            return (
              <li key={e.id} className="flex gap-3 text-sm">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-background/80 text-primary">
                  <Icon className="h-4 w-4" aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="leading-snug text-foreground">{describeEvent(e)}</p>
                  <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">{timeAgo(e.created_at)}</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
