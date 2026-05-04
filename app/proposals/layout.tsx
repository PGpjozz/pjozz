import { OperatorShell } from "@/components/shared/operator-shell";

export default function ProposalsLayout({ children }: { children: React.ReactNode }) {
  return (
    <OperatorShell title="Proposals" description="AI proposal generator" showHeader={false}>
      {children}
    </OperatorShell>
  );
}
