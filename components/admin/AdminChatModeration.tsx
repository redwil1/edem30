"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { Loader2, MessageCircle, Search, Send, ShieldAlert } from "lucide-react";

type Trip = {
  id: number;
  from: string;
  to: string;
  driverName: string;
  status: string;
};

type ChatMessage = {
  id: number;
  authorName: string;
  text: string;
  attachmentUrl: string | null;
  attachmentType: "image" | "video" | null;
  createdAt: string;
  isDriver: boolean;
  isStaff: boolean;
};

export default function AdminChatModeration() {
  const [search, setSearch] = useState("");
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loadingTrips, setLoadingTrips] = useState(false);
  const [selected, setSelected] = useState<Trip | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [value, setValue] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  async function searchTrips(e?: FormEvent) {
    e?.preventDefault();
    setLoadingTrips(true);

    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);

      const res = await fetch(`/api/admin/trips?${params.toString()}`, {
        cache: "no-store",
      });
      const data = await res.json();

      setTrips((data.trips ?? []).slice(0, 20));
    } finally {
      setLoadingTrips(false);
    }
  }

  useEffect(() => {
    searchTrips();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadMessages(tripId: number) {
    const res = await fetch(`/api/trips/${tripId}/messages`, { cache: "no-store" });
    const data = await res.json();
    setMessages(data.messages ?? []);
  }

  useEffect(() => {
    if (!selected) return;

    loadMessages(selected.id);

    const interval = setInterval(() => loadMessages(selected.id), 5000);

    return () => clearInterval(interval);
  }, [selected]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  async function send(e: FormEvent) {
    e.preventDefault();
    if (!selected) return;

    const text = value.trim();
    if (!text || sending) return;

    setError("");
    setSending(true);

    try {
      const res = await fetch(`/api/trips/${selected.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setError(data?.error || "Не удалось отправить сообщение");
        return;
      }

      setValue("");
      setMessages((prev) => [...prev, data]);
    } finally {
      setSending(false);
    }
  }

  return (
    <div>
      <p className="text-sm text-gray-500 mb-4 flex items-start gap-2">
        <ShieldAlert size={15} className="text-yellow-400 shrink-0 mt-0.5" />
        Сообщения от имени поддержки видны участникам поездки с пометкой
        «Поддержка» и приходят им push-уведомлением.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
        <div>
          <form
            onSubmit={searchTrips}
            className="flex items-center gap-2 bg-[#12121c] border border-white/5 rounded-2xl px-4 py-2.5 mb-3"
          >
            <Search size={15} className="text-gray-500 shrink-0" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск по городу"
              className="w-full bg-transparent outline-none text-sm placeholder:text-gray-500"
            />
          </form>

          <div className="bg-[#12121c] border border-white/5 rounded-2xl overflow-hidden max-h-[60vh] overflow-y-auto">
            {loadingTrips ? (
              <div className="py-8 flex items-center justify-center text-gray-500">
                <Loader2 size={18} className="animate-spin" />
              </div>
            ) : (
              trips.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSelected(t)}
                  className={`w-full text-left px-3.5 py-3 border-b border-white/5 last:border-0 transition ${
                    selected?.id === t.id ? "bg-violet-600/15" : "hover:bg-white/5"
                  }`}
                >
                  <div className="text-sm font-medium truncate">
                    {t.from} → {t.to}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    #{t.id} · {t.driverName}
                  </div>
                </button>
              ))
            )}

            {!loadingTrips && trips.length === 0 && (
              <div className="py-8 text-center text-gray-500 text-sm">Ничего не найдено</div>
            )}
          </div>
        </div>

        <div className="bg-[#12121c] border border-white/5 rounded-2xl flex flex-col min-h-[400px] max-h-[70vh]">
          {!selected ? (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-500 gap-2">
              <MessageCircle size={24} />
              <span className="text-sm">Выберите поездку слева</span>
            </div>
          ) : (
            <>
              <div className="px-4 py-3.5 border-b border-white/5 shrink-0">
                <div className="font-medium text-sm">
                  {selected.from} → {selected.to}
                </div>
                <div className="text-xs text-gray-500">Поездка #{selected.id}</div>
              </div>

              <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-3">
                {messages.map((m) => (
                  <div key={m.id} className="max-w-[85%]">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-xs font-medium">{m.authorName}</span>
                      {m.isStaff && (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-300">
                          Поддержка
                        </span>
                      )}
                    </div>
                    <div
                      className={`rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                        m.isStaff ? "bg-red-500/10 text-gray-200" : "bg-[#222233] text-gray-200"
                      }`}
                    >
                      {m.text}
                    </div>
                  </div>
                ))}

                {messages.length === 0 && (
                  <div className="text-center text-gray-500 text-sm py-8">
                    В этой поездке пока нет сообщений
                  </div>
                )}
              </div>

              {error && <p className="text-red-400 text-xs px-4 pb-2">{error}</p>}

              <form
                onSubmit={send}
                className="flex items-center gap-2 p-3 border-t border-white/5 shrink-0"
              >
                <input
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder="Написать от имени поддержки..."
                  maxLength={1000}
                  className="flex-1 min-w-0 bg-[#0f0f18] border border-white/10 focus:border-violet-500 rounded-xl px-3.5 py-2.5 outline-none text-sm transition"
                />

                <button
                  type="submit"
                  disabled={sending || !value.trim()}
                  className="btn-gradient w-10 h-10 rounded-xl flex items-center justify-center shrink-0 disabled:opacity-50 transition"
                  aria-label="Отправить"
                >
                  {sending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
