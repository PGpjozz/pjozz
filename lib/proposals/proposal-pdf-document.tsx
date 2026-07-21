import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { ProposalContent } from "@/lib/ai/types";

import { PdfBrandHeader } from "@/components/brand/pdf-brand-header";

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica", color: "#1a1a1a" },
  title: { fontSize: 18, marginBottom: 16, fontFamily: "Helvetica" },
  h2: { fontSize: 12, marginTop: 12, marginBottom: 6, color: "#0a2a22", fontFamily: "Helvetica" },
  body: { lineHeight: 1.45, marginBottom: 8 },
  row: { marginBottom: 4 },
  bullet: { marginLeft: 8, marginBottom: 3 },
});

export function ProposalPdfDocument({ content }: { content: ProposalContent }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <PdfBrandHeader />
        <Text style={styles.title}>{content.title}</Text>
        <Text style={styles.h2}>Executive summary</Text>
        <Text style={styles.body}>{content.executiveSummary}</Text>
        <Text style={styles.h2}>Problem</Text>
        <Text style={styles.body}>{content.problemStatement}</Text>
        <Text style={styles.h2}>Proposed solution</Text>
        <Text style={styles.body}>{content.proposedSolution}</Text>
        <Text style={styles.h2}>Deliverables</Text>
        {content.deliverables.map((d, i) => (
          <Text key={i} style={styles.bullet}>
            • {d.item}: {d.description}
          </Text>
        ))}
        <Text style={styles.h2}>Timeline</Text>
        {content.timeline.map((t, i) => (
          <Text key={i} style={styles.row}>
            {t.phase} ({t.duration}) — {t.description}
          </Text>
        ))}
        <Text style={styles.h2}>Investment options (ZAR)</Text>
        {content.investmentOptions.map((o, i) => (
          <View key={i} style={{ marginBottom: 8 }}>
            <Text style={{ fontFamily: "Helvetica" }}>{o.tier} — R{o.price.toLocaleString("en-ZA")}</Text>
            <Text style={styles.body}>{o.description}</Text>
          </View>
        ))}
        <Text style={styles.h2}>Why Pjozz</Text>
        <Text style={styles.body}>{content.whyPjozz}</Text>
        <Text style={styles.h2}>Next steps</Text>
        <Text style={styles.body}>{content.nextSteps}</Text>
      </Page>
    </Document>
  );
}
