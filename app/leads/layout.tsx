import { OperatorShell } from "@/components/shared/operator-shell";

export default function LeadsSectionLayout({ children }: { children: React.ReactNode }) {
  return (
    <OperatorShell
      title="Leads"
      description="Lead management workspace"
      showHeader={false}
    >
      {children}
    </OperatorShell>
  );
}
