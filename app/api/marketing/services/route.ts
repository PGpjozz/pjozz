import { NextResponse } from "next/server";

import { marketingServices } from "@/lib/marketing/content";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ ok: true as const, data: marketingServices });
}
