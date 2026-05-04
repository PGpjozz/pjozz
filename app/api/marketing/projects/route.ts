import { NextResponse } from "next/server";

import { caseStudies } from "@/lib/marketing/content";

export const dynamic = "force-dynamic";

/** Public read-only case studies for integrations / future mobile apps */
export async function GET() {
  return NextResponse.json({ ok: true as const, data: caseStudies });
}
