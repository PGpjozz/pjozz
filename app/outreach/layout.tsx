import { OperatorShell } from "@/components/shared/operator-shell";

export default function OutreachLayout({ children }: { children: React.ReactNode }) {
  return (
    <OperatorShell title="Outreach" description="Campaign engine" showHeader={false}>
      {children}
    </OperatorShell>
  );
}
