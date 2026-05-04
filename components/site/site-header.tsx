"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X } from "lucide-react";

import { PjozzMark } from "@/components/site/pjozz-mark";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/services", label: "Services" },
  { href: "/solutions", label: "Solutions" },
  { href: "/projects", label: "Projects" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
  { href: "/demo", label: "AI demo" },
  { href: "/portal", label: "Portal" },
  { href: "/client", label: "Client hub" },
] as const;

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#030712]/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 md:px-6">
        <Link href="/" className="transition-opacity hover:opacity-90" onClick={() => setOpen(false)}>
          <PjozzMark />
        </Link>

        <nav className="hidden items-center gap-0.5 lg:flex">
          {LINKS.map(({ href, label }) => {
            const active = pathname === href || (href !== "/" && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "rounded-md px-2.5 py-2 text-xs font-medium transition-colors xl:px-3 xl:text-sm",
                  active
                    ? "bg-cyan-500/15 text-cyan-300"
                    : "text-slate-400 hover:bg-white/5 hover:text-white"
                )}
              >
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/dashboard"
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "hidden border-violet-500/40 text-violet-200 hover:bg-violet-500/10 sm:inline-flex"
            )}
          >
            Team login
          </Link>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="lg:hidden text-slate-300"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((o) => !o)}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {open ? (
        <div className="border-t border-white/10 bg-[#030712]/98 lg:hidden">
          <nav className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-4">
            {LINKS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="rounded-lg px-3 py-3 text-sm font-medium text-slate-200 hover:bg-white/5"
                onClick={() => setOpen(false)}
              >
                {label}
              </Link>
            ))}
            <Link
              href="/dashboard"
              className="mt-2 rounded-lg border border-violet-500/40 px-3 py-3 text-center text-sm text-violet-200"
              onClick={() => setOpen(false)}
            >
              Team login
            </Link>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
