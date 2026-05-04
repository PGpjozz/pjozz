import { APIError } from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

export function aiErrorResponse(context: string, error: unknown): NextResponse {
  console.error(`[api/ai/${context}]`, error);

  if (error instanceof APIError) {
    return NextResponse.json(
      { ok: false as const, error: error.message, code: error.status },
      { status: error.status && error.status >= 400 && error.status < 600 ? error.status : 502 }
    );
  }

  if (error instanceof Error) {
    const msg = error.message;
    if (msg.includes("is not set") || msg.includes("ANTHROPIC_API_KEY")) {
      return NextResponse.json({ ok: false as const, error: "AI is not configured on this server." }, { status: 503 });
    }
    if (msg.includes("Invalid JSON from model") || (msg.includes("Invalid ") && msg.includes("JSON"))) {
      return NextResponse.json({ ok: false as const, error: msg }, { status: 422 });
    }
    return NextResponse.json({ ok: false as const, error: msg }, { status: 500 });
  }

  return NextResponse.json({ ok: false as const, error: "Unexpected server error." }, { status: 500 });
}
