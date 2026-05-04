import { OperatorShell } from "@/components/shared/operator-shell";

export default function ClientsPage() {
  return (
    <OperatorShell
      title="Client portal management"
      description="Active projects, retainers, and revenue rolled up from won leads."
    >
      <p className="text-sm text-muted-foreground">
        Map <code className="rounded bg-muted px-1 py-0.5 text-xs">Client</code> rows to Supabase and
        optionally expose a client-facing portal route later.
      </p>
    </OperatorShell>
  );
}
