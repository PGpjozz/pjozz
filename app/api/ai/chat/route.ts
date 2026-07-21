import type { MessageParam } from "@anthropic-ai/sdk/resources/messages";
import { NextResponse } from "next/server";

import { logAnthropicUsage, streamClaudeChat } from "@/lib/ai/claude";
import { chatMessageSchema } from "@/lib/ai/schemas";
import { getSetting } from "@/lib/settings/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CHAT_SYSTEM = `You are the operator copilot inside the Pjozz Technologies internal dashboard.
Help the team with leads, pipeline, outreach, proposals, and delivery — concise answers, bullet lists when useful.
Assume South African context (ZAR, local SMB norms) unless told otherwise.`;

export async function POST(req: Request) {
  try {
    const flags = await getSetting("features.flags");
    if (flags.enableAi === false) {
      return NextResponse.json({ ok: false as const, error: "AI is disabled in settings." }, { status: 503 });
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ ok: false as const, error: msg }, { status: 500 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ ok: false as const, error: "Expected JSON body." }, { status: 400 });
  }

  const parsed = chatMessageSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false as const, error: "Invalid request body", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const messages = parsed.data.messages as MessageParam[];
  const contextBlock = parsed.data.contextBlock?.trim();
  const system =
    contextBlock && contextBlock.length > 0
      ? `${CHAT_SYSTEM}\n\nCurrent workspace context (JSON; treat as read-only facts for this session):\n${contextBlock}`
      : CHAT_SYSTEM;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const s = streamClaudeChat(messages, { system, maxTokens: 2048 });
        s.on("text", (delta) => {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "text", delta })}\n\n`)
          );
        });
        const final = await s.finalMessage();
        logAnthropicUsage("chat-stream", final);
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`));
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: "error", message: msg })}\n\n`)
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
