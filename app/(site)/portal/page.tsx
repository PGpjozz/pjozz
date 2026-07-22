import { PortalPreviewClient } from "./portal-preview-client";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Client portal — project workspace",
  description:
    "Open proposals, download PDFs, and kick off projects with Pjozz — the same system our delivery team uses, without an operator login.",
  path: "/portal",
  noindex: true,
});

export default function ClientPortalPage() {
  return <PortalPreviewClient />;
}
