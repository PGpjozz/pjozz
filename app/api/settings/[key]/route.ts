import { NextResponse } from "next/server";
import { z } from "zod";

import { publicApiError } from "@/lib/api-error";
import { SETTINGS_REGISTRY, isSettingsKey } from "@/lib/settings/registry";
import { getSetting, setSetting } from "@/lib/settings/store";

export const dynamic = "force-dynamic";

const putSchema = z.object({
  value: z.unknown(),
});

export async function GET(_req: Request, { params }: { params: Promise<{ key: string }> }) {
  try {
    const { key } = await params;
    if (!isSettingsKey(key)) {
      return NextResponse.json({ ok: false as const, error: "Unknown settings key" }, { status: 404 });
    }

    const value = await getSetting(key);
    return NextResponse.json({ ok: true as const, data: { key, value } });
  } catch (e) {
    const msg = publicApiError(e);
    const status = msg.includes("is not set") || msg.includes("Cannot reach") ? 503 : 500;
    return NextResponse.json({ ok: false as const, error: msg }, { status });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ key: string }> }) {
  try {
    const { key } = await params;
    if (!isSettingsKey(key)) {
      return NextResponse.json({ ok: false as const, error: "Unknown settings key" }, { status: 404 });
    }

    let json: unknown;
    try {
      json = await req.json();
    } catch {
      return NextResponse.json({ ok: false as const, error: "Invalid JSON" }, { status: 400 });
    }

    const parsed = putSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false as const, error: "Invalid body", issues: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const value = SETTINGS_REGISTRY[key].schema.parse(parsed.data.value);
    const saved = await setSetting(key, value as never);
    return NextResponse.json({ ok: true as const, data: { key, value: saved } });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json(
        { ok: false as const, error: "Invalid value", issues: e.flatten() },
        { status: 400 }
      );
    }
    const msg = publicApiError(e);
    const status = msg.includes("is not set") || msg.includes("Cannot reach") ? 503 : 500;
    return NextResponse.json({ ok: false as const, error: msg }, { status });
  }
}
