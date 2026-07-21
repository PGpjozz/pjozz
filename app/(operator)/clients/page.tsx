import { OperatorShell } from "@/components/shared/operator-shell";
import { ClientsPageClient } from "@/components/clients/clients-page-client";

export default function ClientsPage() {
  return (
    <OperatorShell
      title="Clients"
      description="Active accounts for billing, retainers, and won work."
      showHeader={false}
    >
      <ClientsPageClient />
    </OperatorShell>
  );
}
