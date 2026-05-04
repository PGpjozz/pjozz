"use client";

import "./globals.css";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en" className="dark">
      <body className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-6 font-sans text-foreground antialiased">
        <div className="max-w-md text-center">
          <h1 className="text-xl font-semibold tracking-tight">Application error</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {error.message || "The app hit a critical error. Try reloading."}
          </p>
          {error.digest ? (
            <p className="mt-2 font-mono text-xs text-muted-foreground">Digest: {error.digest}</p>
          ) : null}
        </div>
        <button
          type="button"
          className="rounded-lg border border-border bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          onClick={() => reset()}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
