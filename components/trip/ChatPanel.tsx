"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Paperclip, Send, Check, Lock, LogOut } from "lucide-react";

import { useAuth } from "@/components/auth/AuthProvider";
import Avatar from "./Avatar";

type Message = {
  id: number;
  authorName: string;
  text: string;
  createdAt: string;
  isYou: boolean;
  isDriver: boolean;
};

function RoleBadge({ isDriver }: { isDriver: boolean }) {
  return (
    <span
      className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
        isDriver
          ? "bg-orange-500/20 text-orange-400"
          : "bg-violet-600/20 text-violet-300"
      }`}
    >
      {isDriver ? "Водитель" : "Пассажир"}
    </span>
  );
}

type Props = {
  tripId: number;
};

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ChatPanel({ tripId }: Props) {
  const { user } = useAuth();
  const router = useRouter();

  const [messages, setMessages] = useState<Message[]>([]);
  const [canPost, setCanPost] = useState(false);
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const [joining, setJoining] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  async function load() {
    const res = await fetch(`/api/trips/${tripId}/messages`, {
      cache: "no-store",
    });
    const data = await res.json();

    setMessages(data.messages);
    setCanPost(data.canPost);
  }

  useEffect(() => {
    load();

    const interval = setInterval(load, 4000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  async function send() {
    const text = value.trim();

    if (!text || !canPost) return;

    setError("");

    const res = await fetch(`/api/trips/${tripId}/messages`, {
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
  }

  async function joinAndUnlock() {
    setJoining(true);

    await fetch(`/api/trips/${tripId}/join`, { method: "POST" });
    await load();

    setJoining(false);
  }

  async function leaveTrip() {
    setLeaving(true);

    await fetch(`/api/trips/${tripId}/leave`, { method: "POST" });
    await load();
    router.refresh();

    setLeaving(false);
  }

  return (
    <div className="bg-[#12121c] border border-white/5 rounded-3xl p-4 sm:p-6 flex flex-col h-full">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <div className="font-bold text-lg">Чат поездки</div>

          <div className="text-sm text-gray-500 mt-0.5">
            Обсудите детали поездки с попутчиками и водителем
          </div>
        </div>

        {canPost && (
          <button
            onClick={leaveTrip}
            disabled={leaving}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-red-400 disabled:opacity-60 transition whitespace-nowrap shrink-0 pt-1"
          >
            <LogOut size={13} />
            {leaving ? "Секунду..." : "Покинуть поездку"}
          </button>
        )}
      </div>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto space-y-4 pr-1 min-h-[380px] max-h-[520px]"
      >
        {messages.length === 0 && (
          <div className="h-full min-h-[300px] flex items-center justify-center text-sm text-gray-500 text-center px-6">
            Пока сообщений нет. Будьте первым, кто напишет в этом чате.
          </div>
        )}

        {messages.map((m) =>
          m.isYou ? (
            <div key={m.id} className="flex justify-end">
              <div className="max-w-[75%]">
                <div className="flex items-center justify-end gap-1.5 mb-1">
                  <span className="text-xs text-gray-500">Вы</span>
                  <RoleBadge isDriver={m.isDriver} />
                </div>

                <div className="bg-violet-600 rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm break-words">
                  {m.text}
                </div>

                <div className="flex items-center justify-end gap-1 text-[11px] text-gray-500 mt-1">
                  {formatTime(m.createdAt)}
                  <Check size={12} className="text-violet-400" />
                </div>
              </div>
            </div>
          ) : (
            <div key={m.id} className="flex gap-3">
              <Avatar name={m.authorName} size={32} />

              <div className="max-w-[75%]">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-xs text-gray-500">{m.authorName}</span>
                  <RoleBadge isDriver={m.isDriver} />
                </div>

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

      {canPost ? (
        <div className="mt-5">
          {error && <p className="text-red-400 text-xs mb-2">{error}</p>}

          <div className="flex items-center gap-2 bg-[#1c1c2b] rounded-2xl px-3 py-2">
            <button className="text-gray-500 hover:text-gray-300 transition p-1.5">
              <Paperclip size={18} />
            </button>

            <input
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                if (error) setError("");
              }}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Напишите сообщение..."
              className="flex-1 bg-transparent outline-none text-sm placeholder:text-gray-500"
            />

            <button
              onClick={send}
              className="bg-violet-600 hover:bg-violet-700 transition w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-3 mt-5 bg-[#1c1c2b] rounded-2xl px-4 py-3.5">
          <div className="flex items-center gap-2.5 text-sm text-gray-400">
            <Lock size={15} className="shrink-0" />
            {user
              ? "Присоединитесь к поездке, чтобы писать в чат"
              : "Войдите и присоединитесь к поездке, чтобы писать в чат"}
          </div>

          {user ? (
            <button
              onClick={joinAndUnlock}
              disabled={joining}
              className="text-sm font-medium text-violet-400 hover:text-violet-300 transition whitespace-nowrap shrink-0"
            >
              {joining ? "Секунду..." : "Присоединиться"}
            </button>
          ) : (
            <Link
              href={`/login?redirect=/trip/${tripId}`}
              className="text-sm font-medium text-violet-400 hover:text-violet-300 transition whitespace-nowrap shrink-0"
            >
              Войти
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
