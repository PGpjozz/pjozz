"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ClientRow = {
  id: string;
  company_name: string;
  email: string | null;
};

type InvoiceRow = {
  id: string;
  client_id: string;
  invoice_number: string;
  status: "draft" | "sent" | "paid" | "overdue" | "void";
  currency: string;
  due_at: string | null;
  total: number;
  created_at: string;
  clients?: { company_name: string; email: string | null } | { company_name: string; email: string | null }[] | null;
};

function fmtZar(v: number): string {
  return `R${(Number(v) || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function smallDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString();
}

export function BillingPageClient() {
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [cr, ir] = await Promise.all([
        fetch("/api/clients?page=1&pageSize=100"),
        fetch("/api/invoices?page=1&pageSize=100"),
      ]);
      const cj = (await cr.json()) as { ok: boolean; data?: { clients: ClientRow[] } };
      const ij = (await ir.json()) as { ok: boolean; data?: { invoices: InvoiceRow[] } };
      if (cj.ok && cj.data) setClients(cj.data.clients);
      if (ij.ok && ij.data) setInvoices(ij.data.invoices);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load billing data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredInvoices = useMemo(() => {
    if (!selectedClientId) return invoices;
    return invoices.filter((i) => i.client_id === selectedClientId);
  }, [invoices, selectedClientId]);

  const totals = useMemo(() => {
    const open = filteredInvoices.filter((i) => i.status === "sent" || i.status === "overdue");
    const overdue = filteredInvoices.filter((i) => i.status === "overdue");
    return {
      openZar: open.reduce((s, r) => s + (Number(r.total) || 0), 0),
      overdueZar: overdue.reduce((s, r) => s + (Number(r.total) || 0), 0),
    };
  }, [filteredInvoices]);

  const createDraftInvoice = async () => {
    if (!selectedClientId) {
      toast.error("Select a client first.");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: selectedClientId,
          items: [{ description: "Project deposit / milestone", quantity: 1, unitPrice: 0 }],
          vatRate: 0.15,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || data.ok === false) throw new Error(data.error ?? "Create invoice failed");
      toast.success("Draft invoice created.");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Create invoice failed");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6 p-6 md:p-10">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-3xl font-semibold tracking-tight text-foreground">Billing</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Create invoices, track overdue amounts, and set up payment plans.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            className="pj-input w-[260px] py-2 text-sm"
            value={selectedClientId}
            onChange={(e) => setSelectedClientId(e.target.value)}
          >
            <option value="">All clients</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.company_name}
              </option>
            ))}
          </select>
          <Button onClick={() => void createDraftInvoice()} disabled={creating || loading || !selectedClientId}>
            {creating ? "Creating…" : "New invoice"}
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-card/40 p-4">
          <p className="text-xs uppercase text-muted-foreground">Open invoices</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">{fmtZar(totals.openZar)}</p>
          <p className="mt-1 text-xs text-muted-foreground">Statuses: sent + overdue</p>
        </div>
        <div className="rounded-xl border border-border bg-card/40 p-4">
          <p className="text-xs uppercase text-muted-foreground">Overdue</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">{fmtZar(totals.overdueZar)}</p>
          <p className="mt-1 text-xs text-muted-foreground">Immediate follow-up list</p>
        </div>
      </div>

      <section className="rounded-xl border border-border bg-card/40">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="font-heading text-sm font-semibold text-foreground">Invoices</h2>
          <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => void load()} disabled={loading}>
            {loading ? "Loading…" : "Refresh"}
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-muted-foreground">
              <tr className="border-b border-border">
                <th className="px-4 py-2 text-left">Invoice</th>
                <th className="px-4 py-2 text-left">Client</th>
                <th className="px-4 py-2 text-left">Status</th>
                <th className="px-4 py-2 text-left">Due</th>
                <th className="px-4 py-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-muted-foreground" colSpan={5}>
                    No invoices yet.
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => {
                  const client = Array.isArray(inv.clients) ? inv.clients[0] : inv.clients;
                  return (
                    <tr key={inv.id} className="border-b border-border/70 last:border-b-0">
                      <td className="px-4 py-3 font-mono text-xs text-primary">
                        <Link href={`/billing/invoices/${inv.id}`} className="hover:underline">
                          {inv.invoice_number}
                        </Link>
                      </td>
                      <td className="px-4 py-3">{client?.company_name ?? "—"}</td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "rounded border px-2 py-0.5 text-xs",
                            inv.status === "paid"
                              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                              : inv.status === "overdue"
                                ? "border-red-500/40 bg-red-500/10 text-red-300"
                                : inv.status === "sent"
                                  ? "border-amber-500/40 bg-amber-500/10 text-amber-200"
                                  : "border-border bg-muted/30 text-muted-foreground"
                          )}
                        >
                          {inv.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{smallDate(inv.due_at)}</td>
                      <td className="px-4 py-3 text-right font-medium">{fmtZar(inv.total)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

