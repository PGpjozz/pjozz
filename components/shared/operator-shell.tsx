import { AppLayout } from "@/components/shared/Layout";

export function OperatorShell({
  children,
  title,
  description,
  showHeader = true,
}: {
  children: React.ReactNode;
  title: string;
  description?: string;
  /** When false, pages render their own title row (e.g. dense data UIs). */
  showHeader?: boolean;
}) {
  return (
    <AppLayout>
      <div className="p-6 md:p-10">
        {showHeader ? (
          <header className="mb-8">
            <h1 className="font-heading text-3xl font-semibold tracking-tight text-foreground">{title}</h1>
            {description ? <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{description}</p> : null}
          </header>
        ) : null}
        {children}
      </div>
    </AppLayout>
  );
}
