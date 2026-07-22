import type { Metadata, Viewport } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { SonnerToaster } from "@/components/sonner-toaster";
import { FeatureFlagsProvider } from "@/components/flags/feature-flags";
import { getSiteUrl } from "@/lib/site-config";
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
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: "Pjozz Technologies",
    template: "%s | Pjozz Technologies",
  },
  description: "Smart systems. Real results. AI-powered business automation for African businesses.",
  applicationName: "Pjozz Technologies",
  authors: [{ name: "Pjozz Technologies" }],
  creator: "Pjozz Technologies",
  publisher: "Pjozz Technologies",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  icons: {
    icon: [{ url: "/brand/pjozz-logo.png", type: "image/png" }],
    apple: [{ url: "/brand/pjozz-logo.png", type: "image/png" }],
    shortcut: [{ url: "/brand/pjozz-logo.png", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#030712" },
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  colorScheme: "dark light",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-ZA" className="dark">
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
