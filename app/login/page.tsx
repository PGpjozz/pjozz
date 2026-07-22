import type { Metadata } from "next";

import { LoginForm } from "@/components/auth/login-form";
import { BrandLogo } from "@/components/brand/brand-logo";

export const metadata: Metadata = {
  title: "Admin sign-in",
  description: "Pjozz Technologies operator console.",
};

export default function LoginPage({
  searchParams,
}: {
  searchParams: { next?: string | string[]; error?: string | string[] };
}) {
  const nextParam = Array.isArray(searchParams.next) ? searchParams.next[0] : searchParams.next;
  const errorParam = Array.isArray(searchParams.error) ? searchParams.error[0] : searchParams.error;
  const nextPath = sanitizeNextPath(nextParam);

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(56,189,248,0.10),transparent)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_100%_10%,rgba(167,139,250,0.07),transparent)]" />
      <div className="relative flex min-h-screen items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="mb-8 flex flex-col items-center gap-3 text-center">
            <BrandLogo href={null} size="lg" tone="dark" />
            <div>
              <h1 className="font-heading text-2xl font-semibold tracking-tight">Operator sign-in</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Enter the admin password to access the Pjozz console.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-border/70 bg-card/70 p-6 shadow-xl shadow-black/30 backdrop-blur">
            <LoginForm nextPath={nextPath} initialError={normaliseError(errorParam)} />
          </div>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Trouble signing in? Contact your Pjozz administrator.
          </p>
        </div>
      </div>
    </div>
  );
}

/** Only allow same-origin path redirects (must start with `/` and not `//` or `/\`). */
function sanitizeNextPath(next: string | undefined): string {
  if (!next) return "/dashboard";
  if (!next.startsWith("/")) return "/dashboard";
  if (next.startsWith("//") || next.startsWith("/\\")) return "/dashboard";
  if (next.startsWith("/login")) return "/dashboard";
  return next;
}

function normaliseError(err: string | undefined): string | null {
  if (!err) return null;
  if (err === "session_expired") return "Your session expired. Please sign in again.";
  return null;
}
