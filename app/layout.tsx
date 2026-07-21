import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { SonnerToaster } from "@/components/sonner-toaster";
import { FeatureFlagsProvider } from "@/components/flags/feature-flags";
import { cn } from "@/lib/utils";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-heading",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Pjozz Technologies — Operator",
    template: "%s | Pjozz Technologies",
  },
  description: "Smart systems. Real results. AI-powered business automation for Pjozz Technologies.",
  icons: {
    icon: [{ url: "/brand/pjozz-logo.png", type: "image/png" }],
    apple: [{ url: "/brand/pjozz-logo.png", type: "image/png" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={cn(
          inter.variable,
          spaceGrotesk.variable,
          "min-h-screen bg-background font-sans antialiased"
        )}
      >
        <FeatureFlagsProvider>{children}</FeatureFlagsProvider>
        <SonnerToaster />
      </body>
    </html>
  );
}
