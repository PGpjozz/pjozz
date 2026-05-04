import { OperatorShell } from "@/components/shared/operator-shell";
import { BillingPageClient } from "@/components/billing/billing-page-client";

export default function BillingPage() {
  return (
    <OperatorShell
      title="Billing"
      description="Invoices, payment plans, and upcoming cashflow. Start by creating an invoice for a client."
      showHeader={false}
    >
      <BillingPageClient />
    </OperatorShell>
  );
}

