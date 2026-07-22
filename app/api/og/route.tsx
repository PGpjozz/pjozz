import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";

import { SITE } from "@/lib/site-config";

export const runtime = "edge";

/**
 * Dynamic Open Graph card (1200×630) for social share previews. Query params:
 *   ?title=…    (defaults to site tagline)
 *   ?subtitle=… (defaults to site description)
 *
 * Uses only inline styles + system-safe font stack so the Edge runtime doesn't
 * need to bundle a font file. Renders on-demand and is cached at the CDN edge
 * via the response headers below.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const title = clip(searchParams.get("title"), 120) || SITE.tagline;
  const subtitle = clip(searchParams.get("subtitle"), 200) || SITE.description;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          padding: "72px",
          background:
            "linear-gradient(135deg, #030712 0%, #0b1120 45%, #1e1b4b 100%)",
          color: "#e2e8f0",
          fontFamily:
            "system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(ellipse 60% 40% at 90% 10%, rgba(167,139,250,0.22), transparent), radial-gradient(ellipse 80% 60% at 10% 110%, rgba(56,189,248,0.18), transparent)",
            display: "flex",
          }}
        />
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 16,
              background: "linear-gradient(135deg, #22d3ee, #a78bfa)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 34,
              fontWeight: 800,
              color: "#0b1120",
              letterSpacing: -1,
            }}
          >
            P
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: -0.5, color: "#fff" }}>
              {SITE.name}
            </div>
            <div style={{ fontSize: 20, color: "#94a3b8", marginTop: 2 }}>
              {SITE.tagline}
            </div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginTop: "auto",
            gap: 20,
          }}
        >
          <div
            style={{
              fontSize: 68,
              fontWeight: 700,
              lineHeight: 1.05,
              letterSpacing: -1.5,
              color: "#f8fafc",
              display: "flex",
            }}
          >
            {title}
          </div>
          <div
            style={{
              fontSize: 26,
              lineHeight: 1.35,
              color: "#cbd5e1",
              display: "flex",
              maxWidth: 1000,
            }}
          >
            {subtitle}
          </div>
          <div style={{ display: "flex", gap: 14, marginTop: 12, alignItems: "center" }}>
            {["AI", "Automation", "Software", "Infrastructure"].map((tag) => (
              <div
                key={tag}
                style={{
                  padding: "8px 16px",
                  borderRadius: 999,
                  border: "1px solid rgba(148,163,184,0.35)",
                  color: "#e2e8f0",
                  fontSize: 20,
                  display: "flex",
                }}
              >
                {tag}
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: {
        "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
      },
    }
  );
}

function clip(input: string | null, max: number): string | null {
  if (!input) return null;
  const s = input.trim();
  if (!s) return null;
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}
