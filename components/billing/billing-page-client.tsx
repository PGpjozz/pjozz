"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ClientRow = {
  id: string;
  company_name: string;
  email: string | null;
  total_revenue?: number;
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
  return `R${(Number(v) || 0).toLocaleString("en-ZA", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function smallDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString();
}

export function BillingPageClient() {
  const router = useRouter();
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [creating, setCreating] = useState(false);
  const [addingClient, setAddingClient] = useState(false);
  const [newClientName, setNewClientName] = useState("");
  const [newClientEmail, setNewClientEmail] = useState("");
  const [showAddClient, setShowAddClient] = useState(false);
  const [showNewInvoice, setShowNewInvoice] = useState(false);

  // Money entry for new invoice
  const [invClientId, setInvClientId] = useState("");
  const [invDescription, setInvDescription] = useState("Project services");
  const [invAmount, setInvAmount] = useState("");
  const [invQty, setInvQty] = useState("1");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [cr, ir] = await Promise.all([
        fetch("/api/clients?page=1&pageSize=100"),
        fetch("/api/invoices?page=1&pageSize=100"),
      ]);
      const cj = (await cr.json()) as { ok: boolean; data?: { clients: ClientRow[] }; error?: string };
      const ij = (await ir.json()) as { ok: boolean; data?: { invoices: InvoiceRow[] }; error?: string };
      if (!cj.ok) throw new Error(cj.error ?? "Failed to load clients");
      if (!ij.ok) throw new Error(ij.error ?? "Failed to load invoices");
      if (cj.data) setClients(cj.data.clients);
      if (ij.data) setInvoices(ij.data.invoices);
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

  const money = useMemo(() => {
    const open = filteredInvoices.filter((i) => i.status === "sent" || i.status === "overdue");
    const overdue = filteredInvoices.filter((i) => i.status === "overdue");
    const paid = filteredInvoices.filter((i) => i.status === "paid");
    const drafts = filteredInvoices.filter((i) => i.status === "draft");
    return {
      openZar: open.reduce((s, r) => s + (Number(r.total) || 0), 0),
      overdueZar: overdue.reduce((s, r) => s + (Number(r.total) || 0), 0),
      collectedZar: paid.reduce((s, r) => s + (Number(r.total) || 0), 0),
      draftZar: drafts.reduce((s, r) => s + (Number(r.total) || 0), 0),
    };
  }, [filteredInvoices]);

  const previewTotal = useMemo(() => {
    const qty = Number(invQty) || 0;
    const unit = Number(invAmount) || 0;
    const sub = Math.round(qty * unit * 100) / 100;
    const vat = Math.round(sub * 0.15 * 100) / 100;
    return { sub, vat, total: Math.round((sub + vat) * 100) / 100 };
  }, [invAmount, invQty]);

  const createClient = async () => {
    const name = newClientName.trim();
    if (!name) {
      toast.error("Company name is required.");
      return;
    }
    setAddingClient(true);
    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: name,
          email: newClientEmail.trim() || undefined,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        data?: { client: ClientRow };
      };
      if (!res.ok || data.ok === false || !data.data?.client) {
        throw new Error(data.error ?? "Create client failed");
      }
      toast.success("Client created.");
      setNewClientName("");
      setNewClientEmail("");
      setShowAddClient(false);
      setSelectedClientId(data.data.client.id);
      setInvClientId(data.data.client.id);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Create client failed");
    } finally {
      setAddingClient(false);
    }
  };

  const openNewInvoice = () => {
    setShowNewInvoice(true);
    setShowAddClient(false);
    setInvClientId(selectedClientId || clients[0]?.id || "");
    setInvDescription("Project services");
    setInvAmount("");
    setInvQty("1");
  };

  const createInvoiceWithMoney = async () => {
    const clientId = invClientId || selectedClientId;
    if (!clientId) {
      toast.error("Select a client.");
      return;
    }
    const amount = Number(invAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Enter an amount in ZAR (e.g. 25000).");
      return;
    }
    const qty = Number(invQty);
    if (!Number.isFinite(qty) || qty <= 0) {
      toast.error("Quantity must be greater than 0.");
      return;
    }
    const description = invDescription.trim() || "Project services";

    setCreating(true);
    try {
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId,
          items: [{ description, quantity: qty, unitPrice: amount }],
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        data?: { invoice?: { id: string } };
      };
      if (!res.ok || data.ok === false || !data.data?.invoice?.id) {
        throw new Error(data.error ?? "Create invoice failed");
      }
      toast.success(`Invoice created for ${fmtZar(previewTotal.total)} (incl. VAT)`);
      router.push(`/billing/invoices/${data.data.invoice.id}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Create invoice failed");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-3xl font-semibold tracking-tight text-foreground">Billing</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Enter ZAR amounts on invoices. Money owed = <strong className="font-medium text-foreground">sent</strong>.
            Collected revenue = mark invoice <strong className="font-medium text-foreground">paid</strong>.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            className="pj-input w-[220px] py-2 text-sm"
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
          <Button variant="outline" onClick={() => setShowAddClient((v) => !v)} disabled={loading}>
            {showAddClient ? "Cancel" : "Add client"}
          </Button>
          <Button onClick={openNewInvoice} disabled={loading || clients.length === 0}>
            New invoice
          </Button>
        </div>
      </div>

      {clients.length === 0 && !loading ? (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          Add a client first (or accept a proposal), then create an invoice and type the amount in ZAR.
        </div>
      ) : null}

      {showAddClient ? (
        <div className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card/40 p-4">
          <label className="grid gap-1 text-xs text-muted-foreground">
            Company name
            <input
              className="pj-input w-[220px] py-2 text-sm text-foreground"
              value={newClientName}
              onChange={(e) => setNewClientName(e.target.value)}
              placeholder="Acme (Pty) Ltd"
            />
          </label>
          <label className="grid gap-1 text-xs text-muted-foreground">
            Email (optional)
            <input
              className="pj-input w-[220px] py-2 text-sm text-foreground"
              value={newClientEmail}
              onChange={(e) => setNewClientEmail(e.target.value)}
              placeholder="billing@acme.co.za"
              type="email"
            />
          </label>
          <Button onClick={() => void createClient()} disabled={addingClient || !newClientName.trim()}>
            {addingClient ? "Saving…" : "Save client"}
          </Button>
        </div>
      ) : null}

      {showNewInvoice ? (
        <section className="space-y-4 rounded-xl border border-primary/35 bg-gradient-to-br from-primary/10 to-card/40 p-4 md:p-5">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h2 className="font-heading text-base font-semibold text-foreground">Enter money (ZAR)</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Unit price is the amount before VAT. 15% VAT is added automatically.
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setShowNewInvoice(false)}>
              Close
            </Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="grid gap-1 text-xs text-muted-foreground sm:col-span-2 lg:col-span-1">
              Client
              <select
                className="pj-input py-2 text-sm text-foreground"
                value={invClientId}
                onChange={(e) => setInvClientId(e.target.value)}
              >
                <option value="">Select…</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.company_name}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-xs text-muted-foreground sm:col-span-2">
              What for?
              <input
                className="pj-input py-2 text-sm text-foreground"
                value={invDescription}
                onChange={(e) => setInvDescription(e.target.value)}
                placeholder="Website build — deposit"
              />
            </label>
            <label className="grid gap-1 text-xs text-muted-foreground">
              Amount (ZAR, excl. VAT)
              <input
                className="pj-input py-2 font-mono text-sm text-foreground"
                type="number"
                min={1}
                step={100}
                inputMode="decimal"
                value={invAmount}
                onChange={(e) => setInvAmount(e.target.value)}
                placeholder="25000"
                autoFocus
              />
            </label>
            <label className="grid gap-1 text-xs text-muted-foreground">
              Qty
              <input
                className="pj-input py-2 font-mono text-sm text-foreground"
                type="number"
                min={0.01}
                step={1}
                value={invQty}
                onChange={(e) => setInvQty(e.target.value)}
              />
            </label>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/80 bg-background/50 px-4 py-3">
            <div className="text-sm text-muted-foreground">
              Subtotal {fmtZar(previewTotal.sub)} · VAT {fmtZar(previewTotal.vat)} ·{" "}
              <span className="font-semibold text-foreground">Total {fmtZar(previewTotal.total)}</span>
            </div>
            <Button onClick={() => void createInvoiceWithMoney()} disabled={creating || !invClientId}>
              {creating ? "Creating…" : "Create invoice"}
            </Button>
          </div>
        </section>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MoneyCard label="Draft (not sent)" value={money.draftZar} hint="Still editable" />
        <MoneyCard label="Open (owed)" value={money.openZar} hint="Sent + overdue" />
        <MoneyCard label="Overdue" value={money.overdueZar} hint="Needs follow-up" />
        <MoneyCard label="Collected (paid)" value={money.collectedZar} hint="Counts as revenue" accent />
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
                    No invoices yet. Click <strong className="text-foreground">New invoice</strong> and enter an amount.
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

function MoneyCard({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: number;
  hint: string;
  accent?: boolean;
}) {
  return (
    <div className={cn("rounded-xl border border-border bg-card/40 p-4", accent && "border-emerald-500/30 bg-emerald-500/5")}>
      <p className="text-xs uppercase text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-foreground">{fmtZar(value)}</p>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}
