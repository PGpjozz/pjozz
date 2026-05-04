import { AppLayout } from "@/components/shared/Layout";

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppLayout>
      <div className="min-h-0 flex-1 p-4 md:p-6 lg:p-8">{children}</div>
    </AppLayout>
  );
}
