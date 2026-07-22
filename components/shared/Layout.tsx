"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Briefcase,
  FileText,
  Home,
  SquareKanban,
  Mail,
  Receipt,
  Settings,
  Users,
} from "lucide-react";

import { BrandLogo } from "@/components/brand/brand-logo";
import { useFeatureFlags } from "@/components/flags/feature-flags";
import { SignOutButton } from "@/components/shared/sign-out-button";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/leads", label: "Leads", icon: Users },
  { href: "/pipeline", label: "Pipeline", icon: SquareKanban },
  { href: "/outreach", label: "Outreach", icon: Mail },
  { href: "/proposals", label: "Proposals", icon: FileText },
  { href: "/clients", label: "Clients", icon: Briefcase },
  { href: "/billing", label: "Billing", icon: Receipt },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

/**
 * Primary operator shell: sidebar + main content. Used across CRM pages.
 */
export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { flags } = useFeatureFlags();
  const aiOn = flags.enableAi;

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="flex shrink-0 flex-col border-b border-border bg-card md:w-56 md:border-b-0 md:border-r">
        <div className="flex flex-1 flex-col gap-1 p-4">
          <div className="mb-2 rounded-lg px-1 py-2">
            <BrandLogo href="/dashboard" size="md" showWordmark tone="dark" priority />
          </div>
          <p className="mb-3 text-[11px] leading-snug text-muted-foreground">Smart systems · Real results</p>
          <nav className="flex flex-row flex-wrap gap-1 md:flex-col">
            {NAV.map(({ href, label, icon: Icon }) => {
              const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                    active
                      ? "bg-primary/15 font-medium text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="mt-auto border-t border-border p-4">
          <div className="flex items-center gap-2 rounded-md border border-border/80 bg-background/60 px-3 py-2">
            <span className="relative flex h-2.5 w-2.5">
              {aiOn ? (
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500/60 opacity-75" />
              ) : null}
              <span
                className={cn(
                  "relative inline-flex h-2.5 w-2.5 rounded-full",
                  aiOn ? "bg-emerald-500" : "bg-muted-foreground/50"
                )}
              />
            </span>
            <span className="text-xs font-medium text-muted-foreground">{aiOn ? "AI active" : "AI off"}</span>
          </div>
          <SignOutButton />
        </div>
      </aside>
      <main className="min-h-0 min-w-0 flex-1">{children}</main>
    </div>
  );
}
