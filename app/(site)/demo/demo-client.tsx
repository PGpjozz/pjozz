"use client";

import { useState } from "react";
import Link from "next/link";
import { Send, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const MOCK_REPLY =
  "Thanks for your message — this is a **marketing demo** only. For production AI with real CRM context, our operators use `/api/ai/chat` with authenticated workspace data.";

export function AiDemoClient() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; text: string }[]>([
    {
      role: "assistant",
      text: "Hi — I’m a sandbox assistant for visitors. Ask how we deliver AI & automation for SA businesses.",
    },
  ]);
  const [pending, setPending] = useState(false);

  const send = () => {
    const t = input.trim();
    if (!t) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", text: t }]);
    setPending(true);
    window.setTimeout(() => {
      setMessages((m) => [...m, { role: "assistant", text: MOCK_REPLY }]);
      setPending(false);
    }, 600);
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 md:px-6 md:py-20">
      <div className="text-center">
        <p className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-xs font-medium text-cyan-200">
          <Sparkles className="h-3.5 w-3.5" aria-hidden />
          Public demo
        </p>
        <h1 className="mt-4 font-heading text-3xl font-semibold text-white md:text-4xl">AI assistant (mock)</h1>
        <p className="mt-3 text-slate-400">
          No API keys on this page — simulates a chat for layout & motion. Your team’s real copilots use server-side
          routes with your data.
        </p>
      </div>

      <div className="mt-10 flex h-[min(60vh,480px)] flex-col rounded-2xl border border-white/10 bg-[#0c1222]">
        <div className="flex-1 space-y-4 overflow-y-auto p-4" aria-live="polite">
          {messages.map((x, i) => (
            <div
              key={i}
              className={cn(
                "max-w-[90%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
                x.role === "user"
                  ? "ml-auto bg-gradient-to-r from-cyan-600 to-violet-600 text-white"
                  : "border border-white/10 bg-white/[0.04] text-slate-200"
              )}
            >
              {x.text}
            </div>
          ))}
          {pending ? <p className="text-xs text-slate-500">Thinking…</p> : null}
        </div>
        <div className="border-t border-white/10 p-3">
          <div className="flex gap-2">
            <label htmlFor="demo-input" className="sr-only">
              Ask the demo assistant
            </label>
            <input
              id="demo-input"
              className="flex-1 rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus-visible:border-cyan-500/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/40"
              placeholder="Ask about automation, AI, or timelines…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), send())}
            />
            <Button
              type="button"
              onClick={send}
              disabled={pending}
              aria-label="Send message"
              className="shrink-0 bg-cyan-600 text-white hover:bg-cyan-500"
            >
              <Send className="h-4 w-4" aria-hidden />
            </Button>
          </div>
          <p className="mt-2 text-center text-xs text-slate-500">
            For the real model, see <Link className="text-cyan-400 hover:underline" href="/dashboard">operator chat</Link>.
          </p>
        </div>
      </div>
    </div>
  );
}
