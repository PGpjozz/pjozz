/**
 * Extract JSON from Claude output (handles optional ```json fences).
 */
export function extractJsonObject(raw: string): string {
  let s = raw.trim();
  const fence = /^```(?:json)?\s*([\s\S]*?)```$/im.exec(s);
  if (fence?.[1]) {
    s = fence[1].trim();
  }
  return s;
}

export function parseJsonObject<T>(raw: string): T {
  const s = extractJsonObject(raw);
  try {
    return JSON.parse(s) as T;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`Invalid JSON from model: ${msg}`);
  }
}
