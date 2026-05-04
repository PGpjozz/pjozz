import { OperatorShell } from "@/components/shared/operator-shell";

export default function PipelineLayout({ children }: { children: React.ReactNode }) {
  return (
    <OperatorShell title="Sales pipeline" description="Kanban stages and deal flow" showHeader={false}>
      {children}
    </OperatorShell>
  );
}
