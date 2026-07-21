"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

type ClientRow = {
  id: string;
  company_name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  retainer_active: boolean;
  retainer_amount: number | null;
  total_revenue: number;
  created_at: string;
};

function fmtZar(v: number): string {
  return `R${(Number(v) || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export function ClientsPageClient() {
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: "1", pageSize: "100" });
      if (q.trim()) params.set("q", q.trim());
      const res = await fetch(`/api/clients?${params}`);
      const json = (await res.json()) as { ok: boolean; data?: { clients: ClientRow[] }; error?: string };
      if (!json.ok) throw new Error(json.error ?? "Failed to load clients");
      setClients(json.data?.clients ?? []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load clients");
    } finally {
      setLoading(false);
    }
  }, [q]);

  useEffect(() => {
    void load();
  }, [load]);

  const createClient = async () => {
    if (!companyName.trim()) {
      toast.error("Company name is required.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: companyName.trim(),
          contactName: contactName.trim() || undefined,
          email: email.trim() || undefined,
          phone: phone.trim() || undefined,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || json.ok === false) throw new Error(json.error ?? "Create failed");
      toast.success("Client created.");
      setCompanyName("");
      setContactName("");
      setEmail("");
      setPhone("");
      setShowAdd(false);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Create failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-3xl font-semibold tracking-tight text-foreground">Clients</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Active accounts for billing, retainers, and won work.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            className="pj-input w-[220px] py-2 text-sm"
            placeholder="Search clients…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <Button variant="outline" onClick={() => setShowAdd((v) => !v)}>
            {showAdd ? "Cancel" : "Add client"}
          </Button>
          <Link
            href="/billing"
            className="inline-flex h-9 items-center rounded-md px-3 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            Billing
          </Link>
        </div>
      </div>

      {showAdd ? (
        <div className="grid gap-3 rounded-xl border border-border bg-card/40 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="grid gap-1 text-xs text-muted-foreground">
            Company
            <input
              className="pj-input py-2 text-sm text-foreground"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
            />
          </label>
          <label className="grid gap-1 text-xs text-muted-foreground">
            Contact
            <input
              className="pj-input py-2 text-sm text-foreground"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
            />
          </label>
          <label className="grid gap-1 text-xs text-muted-foreground">
            Email
            <input
              className="pj-input py-2 text-sm text-foreground"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label className="grid gap-1 text-xs text-muted-foreground">
            Phone
            <input
              className="pj-input py-2 text-sm text-foreground"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </label>
          <div className="sm:col-span-2 lg:col-span-4">
            <Button onClick={() => void createClient()} disabled={saving || !companyName.trim()}>
              {saving ? "Saving…" : "Save client"}
            </Button>
          </div>
        </div>
      ) : null}

      <section className="rounded-xl border border-border bg-card/40">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="font-heading text-sm font-semibold text-foreground">All clients</h2>
          <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => void load()} disabled={loading}>
            {loading ? "Loading…" : "Refresh"}
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-muted-foreground">
              <tr className="border-b border-border">
                <th className="px-4 py-2 text-left">Company</th>
                <th className="px-4 py-2 text-left">Contact</th>
                <th className="px-4 py-2 text-left">Email</th>
                <th className="px-4 py-2 text-left">Retainer</th>
                <th className="px-4 py-2 text-right">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {clients.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-muted-foreground" colSpan={5}>
                    {loading ? "Loading…" : "No clients yet. Add one or accept a proposal."}
                  </td>
                </tr>
              ) : (
                clients.map((c) => (
                  <tr key={c.id} className="border-b border-border/70 last:border-b-0">
                    <td className="px-4 py-3 font-medium text-foreground">{c.company_name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{c.contact_name ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{c.email ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {c.retainer_active ? fmtZar(Number(c.retainer_amount) || 0) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-medium">{fmtZar(Number(c.total_revenue) || 0)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
