/** Collision-resistant document numbers for single-tenant ops. */

export function nextDocumentNumber(prefix: string): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const rnd = Math.random().toString(36).slice(2, 6).toUpperCase();
  const safe = prefix.trim().replace(/[^A-Za-z0-9_-]/g, "") || "DOC";
  return `${safe}-${y}${m}${day}-${rnd}`;
}

export function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

export type LineItemInput = {
  description: string;
  quantity: number;
  unitPrice: number;
};

export function computeInvoiceTotals(items: LineItemInput[], vatRate: number) {
  const lines = items.map((it, idx) => {
    const quantity = Number(it.quantity) || 0;
    const unitPrice = Number(it.unitPrice) || 0;
    const amount = roundMoney(quantity * unitPrice);
    return {
      description: it.description,
      quantity,
      unit_price: unitPrice,
      amount,
      sort_order: idx,
    };
  });
  const subtotal = roundMoney(lines.reduce((s, it) => s + it.amount, 0));
  const vat = roundMoney(subtotal * vatRate);
  const total = roundMoney(subtotal + vat);
  return { lines, subtotal, vat, total };
}
