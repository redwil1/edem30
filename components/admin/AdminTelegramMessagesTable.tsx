"use client";

import { useEffect, useState } from "react";
import { Check, Loader2, Send } from "lucide-react";

type Entry = {
  id: number;
  name: string;
  username: string | null;
  text: string;
  resolved: boolean;
  createdAt: string;
};

export default function AdminTelegramMessagesTable() {
  const [messages, setMessages] = useState<Entry[] | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  async function load() {
    const res = await fetch("/api/admin/telegram-messages", { cache: "no-store" });
    const data = await res.json();
    setMessages(data.messages ?? []);
  }

  useEffect(() => {
    load();

    const interval = setInterval(load, 15_000);

    return () => clearInterval(interval);
  }, []);

  async function resolve(id: number) {
    setBusyId(id);

    try {
      await fetch(`/api/admin/telegram-messages/${id}`, { method: "PATCH" });
      await load();
    } finally {
      setBusyId(null);
    }
  }

  if (!messages) {
    return (
      <div className="py-16 flex items-center justify-center text-gray-500">
        <Loader2 size={20} className="animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-sm text-gray-500 mb-4 flex items-center gap-2">
        <Send size={14} className="text-violet-400" />
        Сообщения от пользователей боту{" "}
        {process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME
          ? `@${process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME}`
          : "поддержки"}{" "}
        в Telegram.
      </p>

      {messages.map((m) => (
        <div
          key={m.id}
          className={`bg-[#12121c] border rounded-2xl p-4 ${
            m.resolved ? "border-white/5 opacity-50" : "border-violet-500/20"
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="font-medium text-sm">
                {m.name} {m.username && <span className="text-gray-500">@{m.username}</span>}
              </div>
              <p className="text-sm text-gray-300 mt-1">{m.text}</p>
            </div>

            <div className="text-xs text-gray-500 whitespace-nowrap">{m.createdAt}</div>
          </div>

          {!m.resolved && (
            <button
              type="button"
              onClick={() => resolve(m.id)}
              disabled={busyId === m.id}
              className="mt-3 flex items-center gap-1.5 text-xs font-medium bg-green-500/15 text-green-400 hover:bg-green-500/25 disabled:opacity-50 transition rounded-lg px-3 py-1.5"
            >
              {busyId === m.id ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <Check size={12} />
              )}
              Отметить обработанным
            </button>
          )}
        </div>
      ))}

      {messages.length === 0 && (
        <div className="text-center text-gray-500 py-10">Сообщений пока нет</div>
      )}
    </div>
  );
}
