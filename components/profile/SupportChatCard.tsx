"use client";

import { useEffect, useRef, useState } from "react";
import { Headset, Send } from "lucide-react";

type Message = {
  id: number;
  text: string;
  createdAt: string;
  isYou: boolean;
  isStaff: boolean;
};

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function SupportChatCard() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationExists, setConversationExists] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  async function load() {
    const res = await fetch("/api/support/messages", { cache: "no-store" });
    const data = await res.json().catch(() => null);

    if (data) {
      setMessages(data.messages ?? []);
      setConversationExists(!!data.conversationExists);
    }

    setLoaded(true);
  }

  useEffect(() => {
    load();

    const interval = setInterval(load, 10_000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  async function send() {
    const text = value.trim();

    if (!text || sending) return;

    setSending(true);
    setError("");

    const res = await fetch("/api/support/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });

    const data = await res.json().catch(() => null);

    setSending(false);

    if (!res.ok) {
      setError(data?.error || "Не удалось отправить сообщение");
      return;
    }

    setValue("");
    setMessages((prev) => [...prev, data]);
  }

  return (
    <div className="bg-[#12121c] border border-white/5 rounded-3xl p-4 sm:p-6 mt-6">
      <div className="flex items-center gap-2.5 mb-4">
        <Headset size={18} className="text-violet-400" />
        <div className="font-display font-bold text-lg">Поддержка</div>
      </div>

      {!loaded ? null : !conversationExists ? (
        <p className="text-sm text-gray-500">
          Пока нет сообщений от поддержки. Если администратор напишет вам, диалог
          появится здесь и вы сможете ответить.
        </p>
      ) : (
        <>
          <div
            ref={scrollRef}
            className="space-y-3 max-h-[360px] overflow-y-auto pr-1 mb-4"
          >
            {messages.map((m) =>
              m.isYou ? (
                <div key={m.id} className="flex justify-end">
                  <div className="max-w-[80%]">
                    <div className="bubble-gradient rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm break-words">
                      {m.text}
                    </div>
                    <div className="text-[11px] text-gray-500 mt-1 text-right">
                      {formatTime(m.createdAt)}
                    </div>
                  </div>
                </div>
              ) : (
                <div key={m.id} className="flex justify-start">
                  <div className="max-w-[80%]">
                    <div className="text-xs text-gray-500 mb-1">Поддержка</div>
                    <div className="bg-[#1c1c2b] rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm break-words">
                      {m.text}
                    </div>
                    <div className="text-[11px] text-gray-500 mt-1">
                      {formatTime(m.createdAt)}
                    </div>
                  </div>
                </div>
              )
            )}
          </div>

          {error && <p className="text-red-400 text-xs mb-2">{error}</p>}

          <div className="flex items-center gap-2 bg-[#1c1c2b] rounded-2xl px-3 py-2">
            <input
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                if (error) setError("");
              }}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Ответить поддержке..."
              className="flex-1 bg-transparent outline-none text-sm placeholder:text-gray-500"
            />

            <button
              onClick={send}
              disabled={sending}
              className="btn-gradient transition w-9 h-9 rounded-xl flex items-center justify-center shrink-0 disabled:opacity-50"
            >
              <Send size={16} />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
