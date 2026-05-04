"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type InvoiceItem = {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
};

type InvoiceDetail = {
  id: string;
  invoice_number: string;
  status: "draft" | "sent" | "paid" | "overdue" | "void";
  currency: string;
  issued_at: string | null;
  due_at: string | null;
  subtotal: number;
  vat: number;
  total: number;
  notes: string | null;
  clients?: { company_name: string; email: string | null } | { company_name: string; email: string | null }[] | null;
  invoice_items?: InvoiceItem[] | null;
};

function fmtZar(v: number): string {
  return `R${(Number(v) || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export function InvoiceDetailClient({ invoiceId }: { invoiceId: string }) {
  const [inv, setInv] = useState<InvoiceDetail | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/invoices/${invoiceId}`);
      const json = (await res.json()) as { ok: boolean; data?: InvoiceDetail; error?: string };
      if (!json.ok || !json.data) throw new Error(json.error ?? "Invoice not found");
      setInv(json.data);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load invoice");
    }
  }, [invoiceId]);

  useEffect(() => {
    void load();
  }, [load]);

  const client = useMemo(():
    | { company_name: string; email: string | null }
    | undefined => {
    const c = inv?.clients;
    if (!c) return undefined;
    return Array.isArray(c) ? c[0] : c;
  }, [inv]);

  const setStatus = async (status: InvoiceDetail["status"]) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/invoices/${invoiceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const json = (await res.json()) as { ok: boolean; data?: InvoiceDetail; error?: string };
      if (!json.ok || !json.data) throw new Error(json.error ?? "Update failed");
      setInv(json.data);
      toast.success("Updated.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    } finally {
      setBusy(false);
    }
  };

  if (!inv) {
    return (
      <div className="p-6 md:p-10">
        <p className="text-sm text-muted-foreground">Loading invoice…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 md:p-10">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/billing" className="text-sm text-primary hover:underline">
            ← Billing
          </Link>
          <h1 className="mt-2 font-heading text-2xl font-semibold text-foreground">{inv.invoice_number}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{client?.company_name ?? "Client"}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(["draft", "sent", "paid", "overdue", "void"] as const).map((s) => (
            <Button
              key={s}
              size="sm"
              variant={inv.status === s ? "secondary" : "outline"}
              disabled={busy}
              onClick={() => void setStatus(s)}
              className={cn(inv.status === s && "pointer-events-none")}
            >
              {s}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card/40 p-4">
          <p className="text-xs uppercase text-muted-foreground">Subtotal</p>
          <p className="mt-2 text-xl font-semibold text-foreground">{fmtZar(inv.subtotal)}</p>
        </div>
        <div className="rounded-xl border border-border bg-card/40 p-4">
          <p className="text-xs uppercase text-muted-foreground">VAT</p>
          <p className="mt-2 text-xl font-semibold text-foreground">{fmtZar(inv.vat)}</p>
        </div>
        <div className="rounded-xl border border-border bg-card/40 p-4">
          <p className="text-xs uppercase text-muted-foreground">Total</p>
          <p className="mt-2 text-xl font-semibold text-foreground">{fmtZar(inv.total)}</p>
        </div>
      </div>

      <section className="rounded-xl border border-border bg-card/40">
        <div className="border-b border-border px-4 py-3">
          <h2 className="font-heading text-sm font-semibold text-foreground">Line items</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-muted-foreground">
              <tr className="border-b border-border">
                <th className="px-4 py-2 text-left">Description</th>
                <th className="px-4 py-2 text-right">Qty</th>
                <th className="px-4 py-2 text-right">Unit</th>
                <th className="px-4 py-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {(inv.invoice_items ?? []).map((it) => (
                <tr key={it.id} className="border-b border-border/70 last:border-b-0">
                  <td className="px-4 py-3">{it.description}</td>
                  <td className="px-4 py-3 text-right">{Number(it.quantity)}</td>
                  <td className="px-4 py-3 text-right">{fmtZar(Number(it.unit_price))}</td>
                  <td className="px-4 py-3 text-right font-medium">{fmtZar(Number(it.amount))}</td>
                </tr>
              ))}
              {(inv.invoice_items ?? []).length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-muted-foreground" colSpan={4}>
                    No items.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

