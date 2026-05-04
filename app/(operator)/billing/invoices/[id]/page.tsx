import { OperatorShell } from "@/components/shared/operator-shell";
import { InvoiceDetailClient } from "@/components/billing/invoice-detail-client";

export default function InvoiceDetailPage({ params }: { params: { id: string } }) {
  return (
    <OperatorShell title="Invoice" description="Invoice detail and status updates." showHeader={false}>
      <InvoiceDetailClient invoiceId={params.id} />
    </OperatorShell>
  );
}

