"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { defaultCampaignSettings } from "@/lib/campaigns/defaults";
import type { Campaign, CampaignSettings, CampaignType } from "@/types";

const TYPES: CampaignType[] = ["email", "whatsapp", "linkedin", "multichannel"];

export function CampaignSettingsForm({
  campaignId,
  campaign,
  onSaved,
}: {
  campaignId: string;
  campaign: Campaign;
  onSaved: () => void;
}) {
  const s = campaign.settings ?? defaultCampaignSettings();
  const [name, setName] = useState(campaign.name);
  const [description, setDescription] = useState(campaign.description ?? "");
  const [type, setType] = useState<CampaignType>(campaign.type);
  const [weekdays, setWeekdays] = useState<number[]>(s.sendWindow.weekdays);
  const [startHour, setStartHour] = useState(String(s.sendWindow.startHour));
  const [endHour, setEndHour] = useState(String(s.sendWindow.endHour));
  const [timezone, setTimezone] = useState(s.sendWindow.timezone);
  const [dailyLimit, setDailyLimit] = useState(String(s.dailySendLimit));
  const [pauseOnReply, setPauseOnReply] = useState(s.pauseOnReply);
  const [blocklist, setBlocklist] = useState(s.blocklistOnUnsubscribe);
  const [saving, setSaving] = useState(false);

  function toggleWeekday(d: number) {
    setWeekdays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort((a, b) => a - b)));
  }

  async function save() {
    setSaving(true);
    try {
      const settings: CampaignSettings = {
        sendWindow: {
          weekdays: weekdays.length ? weekdays : [1, 2, 3, 4, 5],
          startHour: Math.min(23, Math.max(0, Number.parseInt(startHour, 10) || 8)),
          endHour: Math.min(23, Math.max(0, Number.parseInt(endHour, 10) || 17)),
          timezone: timezone || "Africa/Johannesburg",
        },
        dailySendLimit: Math.min(5000, Math.max(1, Number.parseInt(dailyLimit, 10) || 50)),
        pauseOnReply,
        blocklistOnUnsubscribe: blocklist,
        serviceFocus: s.serviceFocus,
      };
      const res = await fetch(`/api/campaigns/${campaignId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description: description || null,
          type,
          settings,
        }),
      });
      const json = (await res.json()) as { ok: boolean; error?: string };
      if (!json.ok) throw new Error(json.error ?? "Save failed");
      toast.success("Settings saved");
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  const dayLabels: { d: number; l: string }[] = [
    { d: 1, l: "Mon" },
    { d: 2, l: "Tue" },
    { d: 3, l: "Wed" },
    { d: 4, l: "Thu" },
    { d: 5, l: "Fri" },
    { d: 6, l: "Sat" },
    { d: 7, l: "Sun" },
  ];

  return (
    <div className="space-y-4 rounded-xl border border-border bg-card/30 p-4">
      <h2 className="font-heading text-sm font-semibold text-primary">Campaign settings</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs uppercase text-muted-foreground">Name</label>
          <input className="pj-input w-full font-mono text-sm" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs uppercase text-muted-foreground">Description</label>
          <textarea
            className="pj-input min-h-[72px] w-full font-mono text-sm"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs uppercase text-muted-foreground">Type</label>
          <select className="pj-input w-full font-mono text-sm" value={type} onChange={(e) => setType(e.target.value as CampaignType)}>
            {TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs uppercase text-muted-foreground">Daily send limit</label>
          <input className="pj-input w-full font-mono text-sm" type="number" min={1} value={dailyLimit} onChange={(e) => setDailyLimit(e.target.value)} />
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs uppercase text-muted-foreground">Send window (SAST)</p>
        <div className="mb-2 flex flex-wrap gap-2">
          {dayLabels.map(({ d, l }) => (
            <button
              key={d}
              type="button"
              onClick={() => toggleWeekday(d)}
              className={`rounded-md border px-2 py-1 font-mono text-xs ${
                weekdays.includes(d) ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground"
              }`}
            >
              {l}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-[10px] uppercase text-muted-foreground">Start hour</label>
            <input className="pj-input w-full font-mono text-sm" type="number" min={0} max={23} value={startHour} onChange={(e) => setStartHour(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-[10px] uppercase text-muted-foreground">End hour</label>
            <input className="pj-input w-full font-mono text-sm" type="number" min={0} max={23} value={endHour} onChange={(e) => setEndHour(e.target.value)} />
          </div>
          <div className="col-span-2 sm:col-span-1">
            <label className="mb-1 block text-[10px] uppercase text-muted-foreground">IANA timezone</label>
            <input className="pj-input w-full font-mono text-sm" value={timezone} onChange={(e) => setTimezone(e.target.value)} />
          </div>
        </div>
      </div>

      <label className="flex cursor-pointer items-center gap-2 font-mono text-xs text-muted-foreground">
        <input type="checkbox" checked={pauseOnReply} onChange={(e) => setPauseOnReply(e.target.checked)} />
        Pause sequence on reply (uses inbound webhooks when tagged)
      </label>
      <label className="flex cursor-pointer items-center gap-2 font-mono text-xs text-muted-foreground">
        <input type="checkbox" checked={blocklist} onChange={(e) => setBlocklist(e.target.checked)} />
        Unsubscribe → auto-remove + blocklist
      </label>

      <Button type="button" disabled={saving} onClick={() => void save()}>
        {saving ? "Saving…" : "Save settings"}
      </Button>
    </div>
  );
}
