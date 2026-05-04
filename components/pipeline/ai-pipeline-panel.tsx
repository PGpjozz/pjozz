"use client";

import { useCallback, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ChatMsg = { role: "user" | "assistant"; content: string };

type Props = {
  open: boolean;
  onClose: () => void;
  pipelineContext: string;
  /** Org-wide daily brief (GET /api/ai/daily-brief). */
  dailyBriefSummary?: string | null;
  dailyBriefLoading?: boolean;
};

export function AiPipelinePanel({
  open,
  onClose,
  pipelineContext,
  dailyBriefSummary,
  dailyBriefLoading,
}: Props) {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const busyRef = useRef(false);

  const send = useCallback(
    async (userText: string) => {
      const trimmed = userText.trim();
      if (!trimmed || busyRef.current) return;
      busyRef.current = true;
      setStreaming(true);
      abortRef.current?.abort();
      abortRef.current = new AbortController();

      const nextUser: ChatMsg = { role: "user", content: trimmed };
      setMessages((m) => [...m, nextUser]);
      setInput("");

      const payloadMessages: ChatMsg[] = [
        {
          role: "user",
          content: `${pipelineContext}\n\n---\nOperator question:\n${trimmed}`,
        },
      ];

      let assistant = "";
      setMessages((m) => [...m, { role: "assistant", content: "" }]);

      try {
        const res = await fetch("/api/ai/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: payloadMessages }),
          signal: abortRef.current.signal,
        });
        if (!res.ok || !res.body) {
          throw new Error(await res.text());
        }
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buf = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          const parts = buf.split("\n\n");
          buf = parts.pop() ?? "";
          for (const block of parts) {
            for (const line of block.split("\n")) {
              if (!line.startsWith("data: ")) continue;
              try {
                const evt = JSON.parse(line.slice(6)) as { type: string; delta?: string; message?: string };
                if (evt.type === "text" && evt.delta) {
                  assistant += evt.delta;
                  setMessages((m) => {
                    const copy = [...m];
                    const last = copy[copy.length - 1];
                    if (last?.role === "assistant") {
                      copy[copy.length - 1] = { role: "assistant", content: assistant };
                    }
                    return copy;
                  });
                }
                if (evt.type === "error") throw new Error(evt.message ?? "Stream error");
              } catch {
                /* ignore partial JSON */
              }
            }
          }
        }
      } catch (e) {
        if ((e as Error).name === "AbortError") return;
        setMessages((m) => {
          const copy = [...m];
          const last = copy[copy.length - 1];
          if (last?.role === "assistant" && !last.content) {
            copy[copy.length - 1] = {
              role: "assistant",
              content: `Error: ${e instanceof Error ? e.message : "Request failed"}`,
            };
          }
          return copy;
        });
      } finally {
        busyRef.current = false;
        setStreaming(false);
      }
    },
    [pipelineContext]
  );

  if (!open) return null;

  return (
    <aside className="flex w-full max-w-md shrink-0 flex-col border-l border-border bg-[#0A0A0A] shadow-xl">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="font-heading text-sm font-semibold text-primary">AI pipeline assistant</h2>
        <button type="button" className="text-xs text-muted-foreground hover:text-foreground" onClick={onClose}>
          Close
        </button>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3 text-sm">
        {dailyBriefLoading ? (
          <p className="rounded-md border border-border bg-card/40 p-2 font-mono text-xs text-muted-foreground">
            Loading AI daily brief…
          </p>
        ) : dailyBriefSummary ? (
          <div className="rounded-md border border-primary/25 bg-primary/5 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-primary">Daily brief</p>
            <p className="mt-2 whitespace-pre-wrap font-mono text-xs leading-relaxed text-foreground">
              {dailyBriefSummary}
            </p>
          </div>
        ) : null}
        <p className="rounded-md border border-border bg-card/40 p-2 text-xs text-muted-foreground">
          Context loaded from the current board (stages, values, filters). Ask about risk, priorities, or follow-ups.
        </p>
        {messages.map((m, i) => (
          <div
            key={i}
            className={cn(
              "rounded-lg px-3 py-2",
              m.role === "user" ? "ml-4 bg-muted/40 text-foreground" : "mr-4 bg-primary/10 text-foreground"
            )}
          >
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{m.role}</p>
            <p className="mt-1 whitespace-pre-wrap font-mono text-xs leading-relaxed">{m.content}</p>
          </div>
        ))}
      </div>
      <div className="border-t border-border p-3">
        <textarea
          className="pj-input mb-2 min-h-[72px] font-mono text-xs"
          placeholder="Which deals are at risk? What should I focus on today?"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={streaming}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send(input);
            }
          }}
        />
        <Button className="w-full" size="sm" disabled={streaming || !input.trim()} onClick={() => void send(input)}>
          {streaming ? "Thinking…" : "Send"}
        </Button>
      </div>
    </aside>
  );
}
