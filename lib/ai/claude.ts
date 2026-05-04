import Anthropic from "@anthropic-ai/sdk";
import type { Message, TextBlock } from "@anthropic-ai/sdk/resources/messages/messages";
import type { MessageParam } from "@anthropic-ai/sdk/resources/messages";

/** Used when `ANTHROPIC_MODEL` is unset — Haiku 4.5 is the cheapest current Messages API tier. */
export const DEFAULT_MODEL = "claude-haiku-4-5" as const;

export function resolveClaudeModel(explicit?: string): string {
  const trimmed = explicit?.trim();
  if (trimmed) return trimmed;
  const fromEnv = process.env.ANTHROPIC_MODEL?.trim();
  if (fromEnv) return fromEnv;
  return DEFAULT_MODEL;
}

/** Tighter JSON for prompts — saves input tokens vs `JSON.stringify(x, null, 2)`. */
export function compactJsonForAi(value: unknown): string {
  return JSON.stringify(value);
}

/**
 * Applies optional `ANTHROPIC_MAX_OUTPUT_CAP` so long outputs cannot burn past a ceiling.
 * You are billed for tokens the model actually emits, not this cap; a lower cap can still truncate long JSON.
 */
export function effectiveMaxOutputTokens(requested: number): number {
  const r = Number.isFinite(requested) && requested >= 1 ? Math.floor(requested) : 4096;
  const capStr = process.env.ANTHROPIC_MAX_OUTPUT_CAP?.trim();
  if (!capStr) return r;
  const cap = Number.parseInt(capStr, 10);
  if (!Number.isFinite(cap) || cap < 1) return r;
  return Math.min(r, cap);
}

/**
 * Core identity: Claude acts as the in-house AI brain for operator workflows
 * (lead scoring, outreach, proposals, briefings). Task prompts extend this.
 */
export const PJozz_BRAIN_SYSTEM_PROMPT = `You are the AI brain of Pjozz Technologies — a South African technology company delivering web apps, mobile apps, custom software, automation, network infrastructure, and security camera installations.

Operating principles:
- Be accurate, concise, and commercially aware for the South African market (ZAR, local business norms, load-shedding and connectivity realities where relevant).
- Prefer actionable outputs over generic advice. When uncertain, say what you need to know next.
- Never invent private facts about a lead or client; only infer from data provided.
- Respect privacy: do not repeat full personal data unnecessarily in outputs.
- Align recommendations with Pjozz positioning: "Smart systems. Real results."`;

/** Haiku-class list pricing ballpark (USD / token) — for ops logging only, not billing. */
const EST_INPUT_USD_PER_TOKEN = 1 / 1_000_000;
const EST_OUTPUT_USD_PER_TOKEN = 5 / 1_000_000;

export type ClaudeMessage = MessageParam;

let clientSingleton: Anthropic | null = null;

export function getAnthropicClient(): Anthropic {
  if (!clientSingleton) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY is not set");
    }
    clientSingleton = new Anthropic({ apiKey });
  }
  return clientSingleton;
}

export function getTextBlocksFromMessage(message: Message): string {
  return message.content
    .filter((block): block is TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("")
    .trim();
}

export function logAnthropicUsage(context: string, message: Message, model: string = resolveClaudeModel()): void {
  const usage = message.usage;
  const input = usage.input_tokens ?? 0;
  const output = usage.output_tokens ?? 0;
  const estUsd = input * EST_INPUT_USD_PER_TOKEN + output * EST_OUTPUT_USD_PER_TOKEN;
  console.log(
    `[AI usage] ${context} | model=${model} | input_tokens=${input} | output_tokens=${output} | est_usd=${estUsd.toFixed(4)}`
  );
}

export async function runClaudeJsonTask(params: {
  context: string;
  taskSystemPrompt: string;
  userPayload: string;
  maxTokens?: number;
}): Promise<{ message: Message; text: string }> {
  const client = getAnthropicClient();
  const system = `${PJozz_BRAIN_SYSTEM_PROMPT}\n\n${params.taskSystemPrompt}\n\nRespond with valid JSON only. No markdown fences, no commentary outside the JSON object.`;
  const model = resolveClaudeModel();
  const message = await client.messages.create({
    model,
    max_tokens: effectiveMaxOutputTokens(params.maxTokens ?? 3072),
    system,
    messages: [{ role: "user", content: params.userPayload }],
  });
  logAnthropicUsage(params.context, message, model);
  return { message, text: getTextBlocksFromMessage(message) };
}

export async function createClaudeMessage(
  messages: ClaudeMessage[],
  options?: { maxTokens?: number; system?: string; model?: string }
): Promise<Message> {
  const client = getAnthropicClient();
  const system = options?.system
    ? `${PJozz_BRAIN_SYSTEM_PROMPT}\n\n${options.system}`
    : PJozz_BRAIN_SYSTEM_PROMPT;
  const model = resolveClaudeModel(options?.model);
  const message = await client.messages.create({
    model,
    max_tokens: effectiveMaxOutputTokens(options?.maxTokens ?? 3072),
    system,
    messages,
  });
  logAnthropicUsage("createClaudeMessage", message, model);
  return message;
}

/** Stream assistant text for chat; caller should log usage after `finalMessage()`. */
export function streamClaudeChat(
  messages: ClaudeMessage[],
  options?: { system?: string; maxTokens?: number; model?: string }
) {
  const client = getAnthropicClient();
  const system = options?.system
    ? `${PJozz_BRAIN_SYSTEM_PROMPT}\n\n${options.system}`
    : PJozz_BRAIN_SYSTEM_PROMPT;
  const model = resolveClaudeModel(options?.model);
  return client.messages.stream({
    model,
    max_tokens: effectiveMaxOutputTokens(options?.maxTokens ?? 2048),
    system,
    messages,
  });
}
