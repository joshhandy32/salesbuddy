"use client";

import { useState } from "react";
import type { ChatMessage } from "@/lib/chat";
import { requestJSON, TimeoutError, TIMEOUT_MSG } from "@/lib/clientFetch";
import Spinner from "./Spinner";

const SUGGESTIONS = [
  "What's the strongest objection likely coming?",
  "Suggest a multi-thread approach for this account.",
  "What should I send to move this forward?",
];

export default function ChatPanel({ briefId }: { briefId: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send(text: string) {
    const q = text.trim();
    if (!q || loading) return;
    const next: ChatMessage[] = [...messages, { role: "user", content: q }];
    setMessages(next);
    setInput("");
    setLoading(true);
    setError(null);
    try {
      const { reply } = await requestJSON<{ reply: string }>(
        "POST",
        `/api/brief/${briefId}/chat`,
        { messages: next },
        30000,
      );
      setMessages((m) => [...m, { role: "assistant", content: reply }]);
    } catch (err) {
      setError(
        err instanceof TimeoutError
          ? TIMEOUT_MSG
          : "Couldn't get an answer — please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="card p-5">
      <h2 className="text-[15px] font-semibold text-ink">Ask about this deal</h2>
      <p className="mb-3 text-[12px] text-muted">
        Follow-up questions, grounded in this call&apos;s transcript and brief.
      </p>

      {messages.length === 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => send(s)}
              className="rounded-btn border border-line px-2.5 py-1 text-[12px] text-body transition-colors hover:bg-coral-bg/60"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {messages.length > 0 && (
        <div className="mb-3 space-y-3">
          {messages.map((m, i) => (
            <div
              key={i}
              className={m.role === "user" ? "flex justify-end" : "flex justify-start"}
            >
              <div
                className={`max-w-[85%] whitespace-pre-wrap rounded-input px-3.5 py-2 text-[13px] leading-relaxed ${
                  m.role === "user"
                    ? "bg-coral text-white"
                    : "border border-line bg-page text-ink"
                }`}
              >
                {m.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex items-center gap-2 text-[12px] text-muted">
              <Spinner /> Thinking…
            </div>
          )}
        </div>
      )}

      {error && <p className="mb-2 text-[12px] text-coral-dark">{error}</p>}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="flex gap-2"
      >
        <input
          className="field"
          placeholder="Ask a follow-up about this deal…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={loading}
        />
        <button type="submit" className="btn-primary" disabled={loading || !input.trim()}>
          Send
        </button>
      </form>
    </section>
  );
}
