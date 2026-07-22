"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import type { LeadServiceType } from "@/types";

const SERVICE_OPTIONS: { id: LeadServiceType; label: string }[] = [
  { id: "webapp", label: "Web app" },
  { id: "mobileapp", label: "Mobile app" },
  { id: "automation", label: "Automation" },
  { id: "network", label: "Networks" },
  { id: "security_cam", label: "Security cameras" },
  { id: "software", label: "Custom software" },
];

const inputClass =
  "w-full rounded-lg border border-cyan-500/20 bg-white/[0.04] px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus-visible:border-cyan-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-cyan-400";

export function ContactForm() {
  const [companyName, setCompanyName] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [selected, setSelected] = useState<LeadServiceType[]>(["webapp"]);
  const [consent, setConsent] = useState(false);
  const [honeypot, setHoneypot] = useState("");
  const [busy, setBusy] = useState(false);

  const toggle = (id: LeadServiceType) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selected.length === 0) {
      toast.error("Pick at least one service.");
      return;
    }
    if (!consent) {
      toast.error("Please agree to the privacy policy to continue.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: companyName.trim() || "Website inquiry",
          contactName: contactName.trim() || undefined,
          email: email.trim(),
          phone: phone.trim() || undefined,
          message: message.trim(),
          serviceTypes: selected,
          consent: true,
          website: honeypot,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || data.ok === false) {
        toast.error(data.error ?? "Could not send message");
        return;
      }
      toast.success("Thanks — we received your enquiry and will respond shortly.");
      setCompanyName("");
      setContactName("");
      setEmail("");
      setPhone("");
      setMessage("");
      setSelected(["webapp"]);
      setConsent(false);
      setHoneypot("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Network error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={(e) => void submit(e)} className="space-y-5" noValidate>
      {/* Honeypot — hidden from assistive tech */}
      <div className="absolute -left-[9999px] h-0 w-0 overflow-hidden" aria-hidden="true">
        <label htmlFor="contact-website">Company website</label>
        <input
          id="contact-website"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          value={honeypot}
          onChange={(e) => setHoneypot(e.target.value)}
        />
      </div>

      <div>
        <label htmlFor="contact-company" className="text-xs uppercase tracking-wider text-slate-500">
          Company / organisation
        </label>
        <input
          id="contact-company"
          className={cn(inputClass, "mt-1")}
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          placeholder="Acme (Pty) Ltd"
          autoComplete="organization"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="contact-name" className="text-xs uppercase tracking-wider text-slate-500">
            Your name
          </label>
          <input
            id="contact-name"
            className={cn(inputClass, "mt-1")}
            value={contactName}
            onChange={(e) => setContactName(e.target.value)}
            placeholder="Jane Doe"
            autoComplete="name"
          />
        </div>
        <div>
          <label htmlFor="contact-email" className="text-xs uppercase tracking-wider text-slate-500">
            Email *
          </label>
          <input
            id="contact-email"
            className={cn(inputClass, "mt-1")}
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.co.za"
            autoComplete="email"
          />
        </div>
      </div>
      <div>
        <label htmlFor="contact-phone" className="text-xs uppercase tracking-wider text-slate-500">
          Phone
        </label>
        <input
          id="contact-phone"
          className={cn(inputClass, "mt-1")}
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+27 ..."
          autoComplete="tel"
        />
      </div>
      <fieldset>
        <legend className="text-xs uppercase tracking-wider text-slate-500">Services *</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {SERVICE_OPTIONS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => toggle(id)}
              aria-pressed={selected.includes(id)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs transition-colors",
                selected.includes(id)
                  ? "border-cyan-500/50 bg-cyan-500/15 text-cyan-200"
                  : "border-white/10 text-slate-400 hover:border-white/20"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </fieldset>
      <div>
        <label htmlFor="contact-message" className="text-xs uppercase tracking-wider text-slate-500">
          Project brief *
        </label>
        <textarea
          id="contact-message"
          className={cn(inputClass, "mt-1 min-h-[140px] resize-y")}
          required
          minLength={20}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="What problem are we solving, timelines, and constraints?"
        />
      </div>
      <label className="flex items-start gap-3 text-sm text-slate-400">
        <input
          type="checkbox"
          className="mt-1 h-4 w-4 rounded border-white/20 bg-white/5 text-cyan-500 focus:ring-cyan-400"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          required
        />
        <span>
          I agree that Pjozz may process this enquiry under the{" "}
          <Link href="/privacy" className="text-cyan-300 underline-offset-2 hover:underline">
            privacy policy
          </Link>
          .
        </span>
      </label>
      <Button
        type="submit"
        disabled={busy}
        className="w-full bg-gradient-to-r from-cyan-500 to-violet-600 text-white hover:opacity-95 sm:w-auto"
      >
        {busy ? "Sending…" : "Send enquiry"}
      </Button>
      <p className="text-xs text-slate-500">
        We reply from the same CRM our delivery team uses — usually within one business day. No spam lists.
      </p>
    </form>
  );
}
