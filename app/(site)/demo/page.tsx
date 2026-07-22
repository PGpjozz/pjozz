import { AiDemoClient } from "./demo-client";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "AI demo — a sandbox assistant",
  description:
    "Try Pjozz's public AI sandbox — a mock assistant that shows the shape of our operator copilots. No API keys, no personal data.",
  path: "/demo",
  noindex: true,
});

export default function AiDemoPage() {
  return <AiDemoClient />;
}
