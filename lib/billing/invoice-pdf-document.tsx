import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

import { PdfBrandHeader } from "@/components/brand/pdf-brand-header";
import { BRAND_NAME } from "@/lib/brand";

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica", color: "#1a1a1a" },
  title: { fontSize: 18, marginBottom: 4 },
  meta: { fontSize: 9, color: "#444", marginBottom: 2 },
  section: { marginTop: 16, marginBottom: 8 },
  h2: { fontSize: 11, marginBottom: 6, color: "#0a2a22" },
  row: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#e5e5e5", paddingVertical: 6 },
  th: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#222", paddingBottom: 6, marginBottom: 2 },
  cellDesc: { flex: 3 },
  cellNum: { flex: 1, textAlign: "right" },
  totals: { marginTop: 12, alignItems: "flex-end" },
  totalLine: { flexDirection: "row", width: 200, justifyContent: "space-between", marginBottom: 3 },
  footer: { marginTop: 28, fontSize: 8, color: "#888" },
});

export type InvoicePdfData = {
  invoiceNumber: string;
  status: string;
  currency: string;
  issuedAt: string | null;
  dueAt: string | null;
  companyName: string;
  companyEmail: string | null;
  notes: string | null;
  subtotal: number;
  vat: number;
  total: number;
  items: Array<{ description: string; quantity: number; unitPrice: number; amount: number }>;
};

function money(n: number, currency: string): string {
  const v = Number(n) || 0;
  if (currency === "ZAR") return `R ${v.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return `${currency} ${v.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-ZA");
}

export function InvoicePdfDocument({ data }: { data: InvoicePdfData }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <PdfBrandHeader />
        <Text style={styles.title}>TAX INVOICE</Text>
        <Text style={styles.meta}>{data.invoiceNumber}</Text>
        <Text style={styles.meta}>Status: {data.status.toUpperCase()}</Text>
        <Text style={styles.meta}>Issued: {fmtDate(data.issuedAt)}</Text>
        <Text style={styles.meta}>Due: {fmtDate(data.dueAt)}</Text>

        <View style={styles.section}>
          <Text style={styles.h2}>Bill to</Text>
          <Text>{data.companyName}</Text>
          {data.companyEmail ? <Text style={styles.meta}>{data.companyEmail}</Text> : null}
        </View>

        <View style={styles.section}>
          <View style={styles.th}>
            <Text style={styles.cellDesc}>Description</Text>
            <Text style={styles.cellNum}>Qty</Text>
            <Text style={styles.cellNum}>Unit</Text>
            <Text style={styles.cellNum}>Amount</Text>
          </View>
          {data.items.map((it, i) => (
            <View key={i} style={styles.row}>
              <Text style={styles.cellDesc}>{it.description}</Text>
              <Text style={styles.cellNum}>{it.quantity}</Text>
              <Text style={styles.cellNum}>{money(it.unitPrice, data.currency)}</Text>
              <Text style={styles.cellNum}>{money(it.amount, data.currency)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.totals}>
          <View style={styles.totalLine}>
            <Text>Subtotal</Text>
            <Text>{money(data.subtotal, data.currency)}</Text>
          </View>
          <View style={styles.totalLine}>
            <Text>VAT</Text>
            <Text>{money(data.vat, data.currency)}</Text>
          </View>
          <View style={styles.totalLine}>
            <Text>Total</Text>
            <Text>{money(data.total, data.currency)}</Text>
          </View>
        </View>

        {data.notes ? (
          <View style={styles.section}>
            <Text style={styles.h2}>Notes</Text>
            <Text>{data.notes}</Text>
          </View>
        ) : null}

        <Text style={styles.footer}>
          {BRAND_NAME} — invoice generated for accounting records. Banking details available on request.
        </Text>
      </Page>
    </Document>
  );
}
