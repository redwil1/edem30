"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Search, Send, X } from "lucide-react";

type ConversationSummary = {
  userId: number;
  name: string;
  phone: string | null;
  lastMessageAt: string;
  lastMessageText: string | null;
  needsReply: boolean;
};

type SearchUser = {
  id: number;
  name: string;
  phone: string | null;
};

type Message = {
  id: number;
  text: string;
  createdAt: string;
  isStaff: boolean;
  senderName: string;
};

function formatTime(iso: string) {
  return new Date(iso).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function phoneLabel(phone: string | null) {
  return phone ? `+${phone}` : "без телефона";
}

export default function AdminSupportInbox() {
  const [conversations, setConversations] = useState<ConversationSummary[] | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [selectedName, setSelectedName] = useState<string>("");

  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationExists, setConversationExists] = useState(false);

  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [searching, setSearching] = useState(false);

  const [value, setValue] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  async function loadConversations() {
    const res = await fetch("/api/admin/support", { cache: "no-store" });
    const data = await res.json().catch(() => null);
    setConversations(data?.conversations ?? []);
  }

  useEffect(() => {
    loadConversations();

    const interval = setInterval(loadConversations, 15_000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setSearching(true);

    const timeout = setTimeout(async () => {
      const res = await fetch(`/api/admin/support/search-users?q=${encodeURIComponent(query)}`);
      const data = await res.json().catch(() => null);
      setSearchResults(data?.users ?? []);
      setSearching(false);
    }, 300);

    return () => clearTimeout(timeout);
  }, [query]);

  async function openConversation(userId: number, name: string) {
    setSelectedUserId(userId);
    setSelectedName(name);
    setQuery("");
    setSearchResults([]);
    await loadMessages(userId);
  }

  async function loadMessages(userId: number) {
    const res = await fetch(`/api/admin/support/${userId}`, { cache: "no-store" });
    const data = await res.json().catch(() => null);
    setMessages(data?.messages ?? []);
    setConversationExists(!!data?.conversationExists);
  }

  useEffect(() => {
    if (!selectedUserId) return;

    const interval = setInterval(() => loadMessages(selectedUserId), 5_000);

    return () => clearInterval(interval);
  }, [selectedUserId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  async function send() {
    const text = value.trim();

    if (!text || !selectedUserId || sending) return;

    setSending(true);
    setError("");

    const res = await fetch(`/api/admin/support/${selectedUserId}`, {
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
    setConversationExists(true);
    setMessages((prev) => [...prev, data]);
    loadConversations();
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4 min-h-[520px]">
      <div className="bg-[#12121c] border border-white/5 rounded-2xl p-3 flex flex-col">
        <div className="flex items-center gap-2 bg-[#1c1c2b] rounded-xl px-3 py-2 mb-3">
          <Search size={15} className="text-gray-500 shrink-0" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Найти пользователя, чтобы написать первым"
            className="flex-1 bg-transparent outline-none text-sm placeholder:text-gray-500"
          />
          {query && (
            <button onClick={() => setQuery("")} className="text-gray-500 hover:text-white">
              <X size={14} />
            </button>
          )}
        </div>

        {query.trim() ? (
          <div className="space-y-1 overflow-y-auto flex-1">
            {searching && (
              <div className="flex items-center justify-center py-6 text-gray-500">
                <Loader2 size={16} className="animate-spin" />
              </div>
            )}

            {!searching &&
              searchResults.map((u) => (
                <button
                  key={u.id}
                  onClick={() => openConversation(u.id, u.name)}
                  className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-white/5 transition"
                >
                  <div className="text-sm font-medium">{u.name}</div>
                  <div className="text-xs text-gray-500">{phoneLabel(u.phone)}</div>
                </button>
              ))}

            {!searching && searchResults.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-6">Никого не найдено</p>
            )}
          </div>
        ) : (
          <div className="space-y-1 overflow-y-auto flex-1">
            {conversations === null && (
              <div className="flex items-center justify-center py-10 text-gray-500">
                <Loader2 size={18} className="animate-spin" />
              </div>
            )}

            {conversations?.map((c) => (
              <button
                key={c.userId}
                onClick={() => openConversation(c.userId, c.name)}
                className={`w-full text-left px-3 py-2.5 rounded-xl transition ${
                  selectedUserId === c.userId ? "bg-violet-600/20" : "hover:bg-white/5"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium truncate">{c.name}</span>
                  {c.needsReply && (
                    <span className="w-2 h-2 rounded-full bg-violet-400 shrink-0" />
                  )}
                </div>
                <div className="text-xs text-gray-500 truncate">
                  {c.lastMessageText ?? "Нет сообщений"}
                </div>
              </button>
            ))}

            {conversations?.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-6">
                Пока нет диалогов. Найдите пользователя выше, чтобы написать первым.
              </p>
            )}
          </div>
        )}
      </div>

      <div className="bg-[#12121c] border border-white/5 rounded-2xl p-4 sm:p-5 flex flex-col">
        {!selectedUserId ? (
          <div className="flex-1 flex items-center justify-center text-sm text-gray-500 text-center px-6">
            Выберите диалог слева или найдите пользователя, чтобы написать ему первым.
          </div>
        ) : (
          <>
            <div className="font-medium mb-4">{selectedName}</div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-3 mb-4 min-h-[300px]">
              {conversationExists ? (
                messages.map((m) => (
                  <div key={m.id} className={`flex ${m.isStaff ? "justify-end" : "justify-start"}`}>
                    <div className="max-w-[75%]">
                      {!m.isStaff && (
                        <div className="text-xs text-gray-500 mb-1">{m.senderName}</div>
                      )}
                      <div
                        className={`rounded-2xl px-4 py-2.5 text-sm break-words ${
                          m.isStaff
                            ? "bubble-gradient rounded-tr-sm"
                            : "bg-[#1c1c2b] rounded-tl-sm"
                        }`}
                      >
                        {m.text}
                      </div>
                      <div
                        className={`text-[11px] text-gray-500 mt-1 ${m.isStaff ? "text-right" : ""}`}
                      >
                        {formatTime(m.createdAt)}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="h-full flex items-center justify-center text-sm text-gray-500 text-center px-6">
                  Диалога ещё нет. Напишите первым — пользователь увидит сообщение в профиле.
                </div>
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
                placeholder="Написать пользователю..."
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
    </div>
  );
}
