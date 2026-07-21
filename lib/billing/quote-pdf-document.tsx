import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { ProposalContent } from "@/lib/ai/types";

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica", color: "#1a1a1a" },
  brand: { fontSize: 11, color: "#00a67e", marginBottom: 2 },
  tagline: { fontSize: 8, color: "#666", marginBottom: 16 },
  title: { fontSize: 18, marginBottom: 6 },
  h2: { fontSize: 12, marginTop: 14, marginBottom: 6, color: "#0a2a22" },
  body: { lineHeight: 1.45, marginBottom: 8 },
  tier: { marginBottom: 10, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: "#eee" },
  price: { fontSize: 12, marginTop: 2, marginBottom: 4 },
  bullet: { marginLeft: 8, marginBottom: 2 },
  footer: { marginTop: 24, fontSize: 8, color: "#888" },
});

/** Commercial quote PDF — pricing-focused companion to the full proposal. */
export function QuotePdfDocument({
  content,
  companyName,
}: {
  content: ProposalContent;
  companyName?: string | null;
}) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.brand}>Pjozz Technologies</Text>
        <Text style={styles.tagline}>Smart systems · Real results</Text>
        <Text style={styles.title}>QUOTATION</Text>
        <Text style={styles.body}>{content.title}</Text>
        {companyName ? <Text style={styles.body}>Prepared for: {companyName}</Text> : null}

        <Text style={styles.h2}>Summary</Text>
        <Text style={styles.body}>{content.executiveSummary}</Text>

        <Text style={styles.h2}>Investment options (ZAR)</Text>
        {content.investmentOptions.map((o, i) => (
          <View key={i} style={styles.tier}>
            <Text>{o.tier}</Text>
            <Text style={styles.price}>R {Number(o.price).toLocaleString("en-ZA")}</Text>
            <Text style={styles.body}>{o.description}</Text>
            {o.features.map((f, j) => (
              <Text key={j} style={styles.bullet}>
                • {f}
              </Text>
            ))}
          </View>
        ))}

        <Text style={styles.h2}>Next steps</Text>
        <Text style={styles.body}>{content.nextSteps}</Text>

        <Text style={styles.footer}>
          This quotation is indicative and subject to a signed proposal / statement of work. Valid for 30 days unless
          otherwise stated. Prices in South African Rand (ZAR), VAT exclusive unless noted.
        </Text>
      </Page>
    </Document>
  );
}
