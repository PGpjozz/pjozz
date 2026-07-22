import { ClientHubClient } from "./client-hub-client";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Client hub — open your proposal",
  description:
    "Open a Pjozz Technologies proposal shared with you. Paste your secure token or use the link from your email to review, accept, or request changes.",
  path: "/client",
  noindex: true,
});

export default function ClientHubPage() {
  return <ClientHubClient />;
}
