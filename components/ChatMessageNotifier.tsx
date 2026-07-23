"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageCircle, X } from "lucide-react";

import { useAuth } from "@/components/auth/AuthProvider";

type ChatMessageNotice = {
  id: number;
  tripId: number;
  senderName: string;
  preview: string;
  routeLabel: string;
};

export default function ChatMessageNotifier() {
  const { user } = useAuth();
  const pathname = usePathname();

  const seenIds = useRef<Set<number> | null>(null);
  const [toasts, setToasts] = useState<ChatMessageNotice[]>([]);

  useEffect(() => {
    if (!user) {
      seenIds.current = null;
      return;
    }

    let cancelled = false;

    async function poll() {
      const res = await fetch("/api/notifications/new-messages", {
        cache: "no-store",
      });

      if (!res.ok || cancelled) return;

      const data = await res.json();
      const messages: ChatMessageNotice[] = data.messages ?? [];

      if (seenIds.current === null) {
        seenIds.current = new Set(messages.map((m) => m.id));
        return;
      }

      const fresh = messages.filter(
        (m) => !seenIds.current!.has(m.id) && pathname !== `/trip/${m.tripId}`
      );

      for (const m of messages) seenIds.current!.add(m.id);

      if (fresh.length > 0) {
        setToasts((prev) => [...fresh, ...prev].slice(0, 4));

        for (const m of fresh) {
          setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== m.id));
          }, 15_000);
        }
      }
    }

    poll();

    const interval = setInterval(poll, 10_000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, pathname]);

  function dismiss(id: number) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  if (!user || toasts.length === 0) return null;

  return (
    <div className="fixed bottom-20 lg:bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-[calc(100%-2rem)]">
      {toasts.map((t) => (
        <Link
          key={t.id}
          href={`/trip/${t.tripId}`}
          onClick={() => dismiss(t.id)}
          className="bg-[#171726] border border-violet-500/30 hover:border-violet-500 rounded-2xl p-3.5 shadow-xl flex items-start gap-3 transition"
        >
          <div className="w-8 h-8 rounded-xl bg-violet-600/20 flex items-center justify-center shrink-0">
            <MessageCircle size={15} className="text-violet-400" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="text-xs font-bold truncate">{t.senderName}</div>
            <div className="text-xs text-gray-400 mt-0.5 truncate">
              {t.preview || t.routeLabel}
            </div>
          </div>

          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              dismiss(t.id);
            }}
            className="text-gray-500 hover:text-white transition shrink-0"
            aria-label="Скрыть"
          >
            <X size={14} />
          </button>
        </Link>
      ))}
    </div>
  );
}
