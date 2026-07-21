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
  receipts?: { id: string; receipt_number: string } | { id: string; receipt_number: string }[] | null;
};

function fmtZar(v: number): string {
  return `R${(Number(v) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function InvoiceDetailClient({ invoiceId }: { invoiceId: string }) {
  const [inv, setInv] = useState<InvoiceDetail | null>(null);
  const [busy, setBusy] = useState(false);
  const [editItems, setEditItems] = useState(false);
  const [draftItems, setDraftItems] = useState<Array<{ description: string; quantity: number; unitPrice: number }>>(
    []
  );

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/invoices/${invoiceId}`);
      const json = (await res.json()) as { ok: boolean; data?: InvoiceDetail; error?: string };
      if (!json.ok || !json.data) throw new Error(json.error ?? "Invoice not found");
      setInv(json.data);
      setDraftItems(
        (json.data.invoice_items ?? []).map((it) => ({
          description: it.description,
          quantity: Number(it.quantity),
          unitPrice: Number(it.unit_price),
        }))
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load invoice");
    }
  }, [invoiceId]);

  useEffect(() => {
    void load();
  }, [load]);

  // If invoice has R0 total, jump straight into money edit mode.
  useEffect(() => {
    if (!inv) return;
    if (inv.status === "paid" || inv.status === "void") return;
    const total = Number(inv.total) || 0;
    if (total <= 0) setEditItems(true);
  }, [inv]);

  const client = useMemo(():
    | { company_name: string; email: string | null }
    | undefined => {
    const c = inv?.clients;
    if (!c) return undefined;
    return Array.isArray(c) ? c[0] : c;
  }, [inv]);

  const receipt = useMemo(() => {
    const r = inv?.receipts;
    if (!r) return null;
    return Array.isArray(r) ? r[0] ?? null : r;
  }, [inv]);

  const setStatus = async (status: InvoiceDetail["status"]) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/invoices/${invoiceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, paymentMethod: status === "paid" ? "eft" : undefined }),
      });
      const json = (await res.json()) as {
        ok: boolean;
        data?: InvoiceDetail;
        error?: string;
        receiptId?: string | null;
        receiptError?: string | null;
      };
      if (!json.ok || !json.data) throw new Error(json.error ?? "Update failed");
      setInv(json.data);
      if (status === "paid") {
        if (json.receiptError) {
          toast.success("Marked paid.");
          toast.error(`Receipt not created: ${json.receiptError}. Run 003_add_receipts.sql if needed.`);
        } else {
          toast.success("Marked paid — receipt ready.");
        }
      } else {
        toast.success("Updated.");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    } finally {
      setBusy(false);
    }
  };

  const saveItems = async () => {
    if (!draftItems.length || draftItems.some((it) => !it.description.trim())) {
      toast.error("Each line needs a description.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/invoices/${invoiceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: draftItems }),
      });
      const json = (await res.json()) as { ok: boolean; data?: InvoiceDetail; error?: string };
      if (!json.ok || !json.data) throw new Error(json.error ?? "Save failed");
      setInv(json.data);
      setEditItems(false);
      toast.success("Line items saved.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
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
          <p className="mt-2 text-xs text-muted-foreground">
            Enter amounts under <span className="text-foreground">Line items → Edit items</span> (ZAR excl. VAT). Mark{" "}
            <span className="text-foreground">sent</span> when billing the client, then <span className="text-foreground">paid</span>{" "}
            when money lands — that creates the receipt.
          </p>
          {receipt ? (
            <p className="mt-1 text-xs text-emerald-400">Receipt: {receipt.receipt_number}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <a href={`/api/invoices/${invoiceId}/pdf`} target="_blank" rel="noreferrer">
            <Button type="button" variant="outline" size="sm">
              Invoice PDF
            </Button>
          </a>
          {inv.status === "paid" ? (
            <a href={`/api/invoices/${invoiceId}/receipt`} target="_blank" rel="noreferrer">
              <Button type="button" variant="secondary" size="sm">
                Receipt PDF
              </Button>
            </a>
          ) : null}
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
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="font-heading text-sm font-semibold text-foreground">Line items</h2>
          <div className="flex gap-2">
            {editItems ? (
              <>
                <Button size="sm" variant="ghost" disabled={busy} onClick={() => setEditItems(false)}>
                  Cancel
                </Button>
                <Button size="sm" disabled={busy} onClick={() => void saveItems()}>
                  Save
                </Button>
              </>
            ) : (
              <Button
                size="sm"
                variant="outline"
                disabled={busy || inv.status === "paid" || inv.status === "void"}
                onClick={() => setEditItems(true)}
              >
                Edit items
              </Button>
            )}
          </div>
        </div>
        <div className="overflow-x-auto">
          {editItems ? (
            <div className="space-y-3 p-4">
              <div className="hidden text-xs uppercase text-muted-foreground sm:grid sm:grid-cols-12 sm:gap-2">
                <span className="sm:col-span-6">Description</span>
                <span className="sm:col-span-2">Qty</span>
                <span className="sm:col-span-3">Amount (ZAR excl. VAT)</span>
              </div>
              {draftItems.map((it, idx) => (
                <div key={idx} className="grid gap-2 sm:grid-cols-12">
                  <input
                    className="pj-input sm:col-span-6 py-2 text-sm"
                    value={it.description}
                    onChange={(e) =>
                      setDraftItems((rows) =>
                        rows.map((r, i) => (i === idx ? { ...r, description: e.target.value } : r))
                      )
                    }
                    placeholder="Description"
                  />
                  <input
                    type="number"
                    min={0.01}
                    step={0.01}
                    className="pj-input sm:col-span-2 py-2 text-sm"
                    value={it.quantity}
                    onChange={(e) =>
                      setDraftItems((rows) =>
                        rows.map((r, i) => (i === idx ? { ...r, quantity: Number(e.target.value) } : r))
                      )
                    }
                  />
                  <input
                    type="number"
                    min={0}
                    step={100}
                    className="pj-input sm:col-span-3 py-2 text-sm"
                    value={it.unitPrice}
                    onChange={(e) =>
                      setDraftItems((rows) =>
                        rows.map((r, i) => (i === idx ? { ...r, unitPrice: Number(e.target.value) } : r))
                      )
                    }
                    placeholder="Amount ZAR"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="sm:col-span-1"
                    onClick={() => setDraftItems((rows) => rows.filter((_, i) => i !== idx))}
                  >
                    ✕
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setDraftItems((rows) => [...rows, { description: "", quantity: 1, unitPrice: 0 }])}
              >
                Add line
              </Button>
            </div>
          ) : (
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
          )}
        </div>
      </section>

      <p className="text-xs text-muted-foreground">
        Workflow: draft → send → paid. Marking paid generates a receipt PDF. Apply{" "}
        <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">003_add_receipts.sql</code> if receipt
        download fails.
      </p>
    </div>
  );
}
