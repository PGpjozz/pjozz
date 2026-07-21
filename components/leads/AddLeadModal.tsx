"use client";

import { useState } from "react";
import { toast } from "sonner";

import { useFeatureFlags } from "@/components/flags/feature-flags";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import type { LeadServiceType } from "@/types";

const SERVICES: LeadServiceType[] = [
  "webapp",
  "mobileapp",
  "automation",
  "network",
  "security_cam",
  "software",
];

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated?: (id: string) => void;
};

export function AddLeadModal({ open, onClose, onCreated }: Props) {
  const { flags } = useFeatureFlags();
  const [companyName, setCompanyName] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [website, setWebsite] = useState("");
  const [industry, setIndustry] = useState("");
  const [source, setSource] = useState("");
  const [notes, setNotes] = useState("");
  const [serviceTypes, setServiceTypes] = useState<LeadServiceType[]>(["webapp"]);
  const [manualOverride, setManualOverride] = useState(false);
  const [manualScore, setManualScore] = useState(50);
  const [skipAi, setSkipAi] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  function toggleService(s: LeadServiceType) {
    setServiceTypes((prev) => {
      if (prev.includes(s)) {
        const next = prev.filter((x) => x !== s);
        return next.length ? next : [s];
      }
      return [...prev, s];
    });
  }

  function resetForm() {
    setCompanyName("");
    setContactName("");
    setEmail("");
    setPhone("");
    setWhatsapp("");
    setWebsite("");
    setIndustry("");
    setSource("");
    setNotes("");
    setServiceTypes(["webapp"]);
    setManualOverride(false);
    setManualScore(50);
    setSkipAi(false);
    setError(null);
  }

  async function submit() {
    setError(null);
    if (!companyName.trim() || !email.trim()) {
      setError("Company name and email are required.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: companyName.trim(),
          contactName: contactName.trim() || undefined,
          email: email.trim(),
          phone: phone.trim() || undefined,
          whatsapp: whatsapp.trim() || undefined,
          website: website.trim() || undefined,
          industry: industry.trim() || undefined,
          source: source.trim() || undefined,
          initialNotes: notes.trim() || undefined,
          serviceTypes,
          manualScore: manualOverride ? manualScore : null,
          skipAi: skipAi || manualOverride || !flags.enableAi,
        }),
      });

      let json: { ok?: boolean; data?: { id?: string }; error?: string } = {};
      try {
        json = (await res.json()) as typeof json;
      } catch {
        throw new Error(res.ok ? "Invalid server response" : `Request failed (${res.status})`);
      }

      if (!res.ok || !json.ok || !json.data?.id) {
        throw new Error(json.error ?? "Failed to create lead");
      }

      toast.success("Lead created");
      onCreated?.(json.data.id);
      resetForm();
      onClose();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error";
      setError(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        className="absolute inset-0 bg-black/70 backdrop-blur-[2px]"
        aria-label="Close"
        onClick={onClose}
      />
      <aside
        className={cn(
          "relative flex h-full w-full max-w-lg flex-col border-l border-border bg-[#0A0A0A] shadow-2xl",
          "animate-in slide-in-from-right duration-200"
        )}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="font-heading text-lg font-semibold text-foreground">Add lead</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            ✕
          </button>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {error ? (
            <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-red-200">
              {error}
            </p>
          ) : null}
          <Field label="Company name *">
            <input
              className="pj-input"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Acme Logistics (Pty) Ltd"
              autoFocus
            />
          </Field>
          <Field label="Contact name">
            <input
              className="pj-input"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
            />
          </Field>
          <Field label="Email *">
            <input
              className="pj-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.co.za"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Phone">
              <input className="pj-input" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </Field>
            <Field label="WhatsApp">
              <input
                className="pj-input"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
              />
            </Field>
          </div>
          <Field label="Website">
            <input
              className="pj-input"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://example.co.za"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Industry">
              <input className="pj-input" value={industry} onChange={(e) => setIndustry(e.target.value)} />
            </Field>
            <Field label="Source">
              <input className="pj-input" value={source} onChange={(e) => setSource(e.target.value)} />
            </Field>
          </div>
          <Field label="Service types (multi)">
            <div className="flex flex-wrap gap-2">
              {SERVICES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => toggleService(s)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                    serviceTypes.includes(s)
                      ? "border-primary bg-primary/15 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/50"
                  )}
                >
                  {s.replace("_", " ")}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Initial notes">
            <textarea
              className="pj-input min-h-[88px] resize-y"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </Field>
          <div className="space-y-2 rounded-lg border border-border bg-card/40 p-3">
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                checked={manualOverride}
                onChange={(e) => setManualOverride(e.target.checked)}
              />
              Manual score override
            </label>
            {manualOverride ? (
              <input
                type="number"
                min={0}
                max={100}
                className="pj-input w-28 font-mono"
                value={manualScore}
                onChange={(e) => setManualScore(Number(e.target.value))}
              />
            ) : null}
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={skipAi || !flags.enableAi}
                disabled={!flags.enableAi}
                onChange={(e) => setSkipAi(e.target.checked)}
              />
              {flags.enableAi ? "Skip AI scoring on create" : "AI scoring disabled in Settings"}
            </label>
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-border px-5 py-4">
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={() => void submit()} disabled={busy}>
            {busy ? "Saving…" : "Create lead"}
          </Button>
        </div>
      </aside>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}
