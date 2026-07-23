"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { Bot, Loader2, MessageCircleQuestion, Send, X } from "lucide-react";

type ChatMessage = {
  role: "user" | "assistant";
  text: string;
};

const GREETING: ChatMessage = {
  role: "assistant",
  text: "Здравствуйте! Я бот поддержки Едем30. Спросите, как заказать такси, создать поездку, оплатить или что-то ещё по сервису.",
};

export default function SupportChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([GREETING]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  async function submit(e: FormEvent) {
    e.preventDefault();

    const text = input.trim();
    if (!text || sending) return;

    setError("");
    const history = [...messages, { role: "user" as const, text }];

    setMessages(history);
    setInput("");
    setSending(true);

    try {
      const res = await fetch("/api/support-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: history
            .filter((m) => m !== GREETING)
            .map((m) => ({ role: m.role, text: m.text })),
        }),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setError(data?.error || "Не удалось отправить сообщение");
        return;
      }

      setMessages((prev) => [...prev, { role: "assistant", text: data.reply }]);
    } catch {
      setError("Не удалось подключиться к серверу");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed bottom-20 lg:bottom-6 right-4 z-40">
      {open && (
        <div className="absolute bottom-[calc(100%+0.75rem)] right-0 w-[calc(100vw-2rem)] max-w-sm bg-[#171726] border border-white/10 rounded-3xl shadow-2xl flex flex-col overflow-hidden max-h-[70vh]">
          <div className="flex items-center justify-between gap-2 px-4 py-3.5 border-b border-white/5 shrink-0">
            <div className="flex items-center gap-2 font-bold text-sm">
              <Bot size={17} className="text-violet-400" />
              Поддержка Едем30
            </div>

            <button
              onClick={() => setOpen(false)}
              className="text-gray-400 hover:text-white transition"
              aria-label="Закрыть"
            >
              <X size={18} />
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-3">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                  m.role === "user"
                    ? "ml-auto bg-violet-600 text-white"
                    : "bg-[#222233] text-gray-200"
                }`}
              >
                {m.text}
              </div>
            ))}

            {sending && (
              <div className="bg-[#222233] rounded-2xl px-3.5 py-2.5 w-fit">
                <Loader2 size={14} className="animate-spin text-gray-400" />
              </div>
            )}
          </div>

          {error && <p className="text-red-400 text-xs px-4 pb-2">{error}</p>}

          <form
            onSubmit={submit}
            className="flex items-center gap-2 p-3 border-t border-white/5 shrink-0"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Напишите сообщение..."
              maxLength={500}
              className="flex-1 min-w-0 bg-[#0f0f18] border border-white/10 focus:border-violet-500 rounded-xl px-3.5 py-2.5 outline-none text-sm transition"
            />

            <button
              type="submit"
              disabled={sending || !input.trim()}
              className="btn-gradient w-10 h-10 rounded-xl flex items-center justify-center shrink-0 disabled:opacity-50 transition"
              aria-label="Отправить"
            >
              <Send size={15} />
            </button>
          </form>
        </div>
      )}

      <button
        onClick={() => setOpen((v) => !v)}
        className="btn-gradient w-14 h-14 rounded-full flex items-center justify-center shadow-xl"
        aria-label="Чат поддержки"
      >
        {open ? <X size={22} /> : <MessageCircleQuestion size={22} />}
      </button>
    </div>
  );
}
