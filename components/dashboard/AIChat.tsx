"use client";

import { MessageCircle, Send, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useFeatureFlags } from "@/components/flags/feature-flags";

const STORAGE_KEY = "pjozz_operator_ai_chat_v1";

type Msg = { role: "user" | "assistant"; content: string };

export function AIChat({
  contextBlock,
  open,
  onOpenChange,
}: {
  contextBlock: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { loading, aiEnabled } = useFeatureFlags();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState("");
  const [busy, setBusy] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Msg[];
        if (Array.isArray(parsed)) setMessages(parsed.filter((m) => m.role && typeof m.content === "string"));
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch {
      /* ignore */
    }
  }, [messages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streaming, open]);

  useEffect(() => {
    if (!aiEnabled && open) onOpenChange(false);
  }, [aiEnabled, open, onOpenChange]);

  const send = useCallback(
    async (userText: string) => {
      if (!aiEnabled) return;
      const trimmed = userText.trim();
      if (!trimmed || busy) return;
      const nextMsgs: Msg[] = [...messages, { role: "user", content: trimmed }];
      setMessages(nextMsgs);
      setInput("");
      setBusy(true);
      setStreaming("");

      try {
        const res = await fetch("/api/ai/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: nextMsgs.map((m) => ({ role: m.role, content: m.content })),
            contextBlock: contextBlock || undefined,
          }),
        });
        if (!res.ok || !res.body) throw new Error("Chat request failed");

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buf = "";
        let assistant = "";
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
                const evt = JSON.parse(line.slice(6)) as { type?: string; delta?: string; message?: string };
                if (evt.type === "text" && typeof evt.delta === "string") {
                  assistant += evt.delta;
                  setStreaming(assistant);
                }
                if (evt.type === "error") throw new Error(String(evt.message ?? "Stream error"));
              } catch {
                /* partial line */
              }
            }
          }
        }
        setMessages((m) => [...m, { role: "assistant", content: assistant || "(No response)" }]);
        setStreaming("");
      } catch (e) {
        setMessages((m) => [
          ...m,
          { role: "assistant", content: e instanceof Error ? e.message : "Something went wrong." },
        ]);
        setStreaming("");
      } finally {
        setBusy(false);
      }
    },
    [aiEnabled, busy, contextBlock, messages]
  );

  return (
    <>
      <button
        type="button"
        aria-label="Open AI chat"
        onClick={() => {
          if (!aiEnabled) return;
          onOpenChange(true);
        }}
        className={cn(
          "fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full border border-primary/50 bg-primary/20 text-primary shadow-lg transition hover:bg-primary/30",
          "shadow-[0_0_28px_rgba(0,229,160,0.35)]",
          open && "pointer-events-none opacity-0"
        )}
        disabled={loading || !aiEnabled}
        title={loading ? "Loading…" : !aiEnabled ? "AI is disabled in Settings" : "Open AI chat"}
      >
        <MessageCircle className="h-7 w-7" />
      </button>

      {open && aiEnabled ? (
        <div
          className="fixed bottom-6 right-6 z-50 flex w-[min(100vw-2rem,400px)] flex-col overflow-hidden rounded-xl border border-border bg-card shadow-2xl"
          style={{ height: "min(500px, calc(100vh - 5rem))" }}
        >
          <div className="flex items-center justify-between border-b border-border bg-background/80 px-3 py-2">
            <div>
              <p className="font-heading text-sm font-semibold text-foreground">Pjozz AI</p>
              <p className="text-[10px] text-muted-foreground">Pipeline-aware copilot</p>
            </div>
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => onOpenChange(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-1 border-b border-border bg-muted/20 px-2 py-2">
            {[
              "What should I focus on today?",
              "How's our pipeline looking?",
              "Draft a short follow-up I can send to a warm lead.",
            ].map((q) => (
              <button
                key={q}
                type="button"
                className="rounded border border-border bg-background/60 px-2 py-1 text-left font-mono text-[10px] text-primary hover:bg-muted"
                onClick={() => void send(q)}
              >
                {q}
              </button>
            ))}
          </div>
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3 text-sm">
            {messages.length === 0 && !streaming ? (
              <p className="text-muted-foreground">Ask anything about leads, pipeline, or outreach.</p>
            ) : null}
            {messages.map((m, i) => (
              <div
                key={i}
                className={cn(
                  "max-w-[95%] rounded-lg px-3 py-2",
                  m.role === "user" ? "ml-auto bg-primary/15 text-foreground" : "mr-auto border border-border bg-background/60"
                )}
              >
                <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
              </div>
            ))}
            {streaming ? (
              <div className="mr-auto max-w-[95%] rounded-lg border border-border bg-background/60 px-3 py-2">
                <p className="whitespace-pre-wrap leading-relaxed">{streaming}</p>
              </div>
            ) : null}
            <div ref={bottomRef} />
          </div>
          <form
            className="flex gap-2 border-t border-border p-2"
            onSubmit={(e) => {
              e.preventDefault();
              void send(input);
            }}
          >
            <input
              className="pj-input flex-1 font-mono text-xs"
              placeholder="Message…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={busy}
            />
            <Button type="submit" size="icon" className="shrink-0" disabled={busy || !input.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      ) : null}
    </>
  );
}
