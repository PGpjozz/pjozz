import { Image, StyleSheet, Text, View } from "@react-pdf/renderer";

import { BRAND_NAME, BRAND_TAGLINE, brandLogoDataUri } from "@/lib/brand";

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e5e5",
  },
  logo: { width: 72, height: 72, objectFit: "contain", marginRight: 12 },
  textCol: { flexDirection: "column", justifyContent: "center", flexGrow: 1 },
  brand: { fontSize: 12, color: "#00a67e", marginBottom: 2 },
  tagline: { fontSize: 8, color: "#666" },
});

/** Shared PDF letterhead with Pjozz logo. */
export function PdfBrandHeader() {
  return (
    <View style={styles.header}>
      <Image src={brandLogoDataUri()} style={styles.logo} />
      <View style={styles.textCol}>
        <Text style={styles.brand}>{BRAND_NAME}</Text>
        <Text style={styles.tagline}>{BRAND_TAGLINE}</Text>
      </View>
    </View>
  );
}
