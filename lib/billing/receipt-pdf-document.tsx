import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

import { PdfBrandHeader } from "@/components/brand/pdf-brand-header";
import { BRAND_NAME } from "@/lib/brand";

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica", color: "#1a1a1a" },
  title: { fontSize: 18, marginBottom: 8 },
  meta: { fontSize: 9, color: "#444", marginBottom: 3 },
  box: { marginTop: 20, padding: 16, borderWidth: 1, borderColor: "#00a67e", borderRadius: 4 },
  amount: { fontSize: 22, marginTop: 8, marginBottom: 4, color: "#0a2a22" },
  footer: { marginTop: 36, fontSize: 8, color: "#888" },
});

export type ReceiptPdfData = {
  receiptNumber: string;
  invoiceNumber: string;
  companyName: string;
  companyEmail: string | null;
  amount: number;
  currency: string;
  paidAt: string;
  paymentMethod: string | null;
  notes: string | null;
};

function money(n: number, currency: string): string {
  const v = Number(n) || 0;
  if (currency === "ZAR") return `R ${v.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return `${currency} ${v.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function ReceiptPdfDocument({ data }: { data: ReceiptPdfData }) {
  const paid = new Date(data.paidAt);
  const paidLabel = Number.isNaN(paid.getTime()) ? data.paidAt : paid.toLocaleString("en-ZA");

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <PdfBrandHeader />
        <Text style={styles.title}>PAYMENT RECEIPT</Text>
        <Text style={styles.meta}>{data.receiptNumber}</Text>
        <Text style={styles.meta}>For invoice: {data.invoiceNumber}</Text>
        <Text style={styles.meta}>Received from: {data.companyName}</Text>
        {data.companyEmail ? <Text style={styles.meta}>{data.companyEmail}</Text> : null}

        <View style={styles.box}>
          <Text>Amount received</Text>
          <Text style={styles.amount}>{money(data.amount, data.currency)}</Text>
          <Text style={styles.meta}>Paid at: {paidLabel}</Text>
          {data.paymentMethod ? <Text style={styles.meta}>Method: {data.paymentMethod}</Text> : null}
          {data.notes ? <Text style={styles.meta}>{data.notes}</Text> : null}
        </View>

        <Text style={styles.footer}>
          This receipt confirms payment received by {BRAND_NAME} against the referenced invoice.
        </Text>
      </Page>
    </Document>
  );
}
