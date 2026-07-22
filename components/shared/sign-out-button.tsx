"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LogOut } from "lucide-react";

import { cn } from "@/lib/utils";

/** Sidebar sign-out button — clears admin cookie and returns to `/login`. */
export function SignOutButton({ className }: { className?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function onClick() {
    if (busy) return;
    setBusy(true);
    try {
      await fetch("/api/auth/logout", { method: "POST", cache: "no-store" });
    } catch {
      // Even if the request fails, force a client-side navigation so a stale
      // UI doesn't linger — middleware will bounce them if the cookie is still
      // valid.
    }
    router.replace("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className={cn(
        "mt-2 flex w-full items-center gap-2 rounded-md border border-border/60 bg-background/40 px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60",
        className
      )}
      aria-label="Sign out"
    >
      <LogOut className="h-3.5 w-3.5" aria-hidden />
      {busy ? "Signing out…" : "Sign out"}
    </button>
  );
}
