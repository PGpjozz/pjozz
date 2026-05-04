import type { ProposalContent } from "@/lib/ai/types";

/** Order of progressive disclosure in the generator UI (single AI response split into SSE steps). */
export const PROPOSAL_STREAM_KEYS: (keyof ProposalContent)[] = [
  "title",
  "executiveSummary",
  "problemStatement",
  "proposedSolution",
  "deliverables",
  "timeline",
  "investmentOptions",
  "whyPjozz",
  "nextSteps",
];

export const SECTION_LABELS: Record<string, string> = {
  title: "Title",
  executiveSummary: "Executive summary",
  problemStatement: "Problem",
  proposedSolution: "Solution",
  deliverables: "Deliverables",
  timeline: "Timeline",
  investmentOptions: "Pricing",
  whyPjozz: "Why Pjozz",
  nextSteps: "Next steps",
};

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
