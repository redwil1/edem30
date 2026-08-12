"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, MessageCircle, AlertTriangle, Star, Car, Flag, UserPlus, Headset, X } from "lucide-react";

import { useAuth } from "@/components/auth/AuthProvider";
import { playNotificationDing } from "@/lib/notificationSound";

type FeedItem = {
  id: string;
  type: "message" | "complaint" | "review" | "order" | "staffReport" | "newUser" | "support";
  title: string;
  body: string;
  url: string;
  createdAt: string;
};

const ICONS = {
  message: MessageCircle,
  complaint: AlertTriangle,
  review: Star,
  order: Car,
  staffReport: Flag,
  newUser: UserPlus,
  support: Headset,
};

function seenKey(userId: number) {
  return `edem30_notif_seen_${userId}`;
}

function dismissedKey(userId: number) {
  return `edem30_notif_dismissed_${userId}`;
}

function loadIds(key: string): Set<string> {
  try {
    const raw = localStorage.getItem(key);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function saveIds(key: string, ids: Set<string>) {
  try {
    localStorage.setItem(key, JSON.stringify([...ids].slice(-200)));
  } catch {}
}

export default function NotificationBell() {
  const { user } = useAuth();
  const [items, setItems] = useState<FeedItem[]>([]);
  const [, setVersion] = useState(0);
  const [open, setOpen] = useState(false);

  const seen = user ? loadIds(seenKey(user.id)) : new Set<string>();
  const dismissed = user ? loadIds(dismissedKey(user.id)) : new Set<string>();
  const knownIds = useRef<Set<string> | null>(null);

  useEffect(() => {
    if (!user) return;

    knownIds.current = null;
    let cancelled = false;

    async function poll() {
      if (document.hidden) return;

      const res = await fetch("/api/notifications/feed", { cache: "no-store" });
      if (!res.ok || cancelled) return;

      const data = await res.json();
      const nextItems: FeedItem[] = data.items ?? [];

      if (knownIds.current !== null) {
        const hasNew = nextItems.some((i) => !knownIds.current!.has(i.id));
        if (hasNew) playNotificationDing();
      }

      knownIds.current = new Set(nextItems.map((i) => i.id));
      setItems(nextItems);
    }

    poll();

    const interval = setInterval(poll, 25_000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [user]);

  if (!user) return null;

  const visibleItems = items.filter((i) => !dismissed.has(i.id));
  const unreadCount = visibleItems.filter((i) => !seen.has(i.id)).length;

  function toggleOpen() {
    setOpen((v) => {
      const next = !v;

      if (next && user) {
        const updated = new Set(seen);
        for (const i of items) updated.add(i.id);
        saveIds(seenKey(user.id), updated);
        setVersion((v) => v + 1);
      }

      return next;
    });
  }

  function closeAll() {
    if (!user) return;

    const updated = new Set(dismissed);
    for (const i of items) updated.add(i.id);
    saveIds(dismissedKey(user.id), updated);
    setVersion((v) => v + 1);
  }

  return (
    <div className="relative">
      <button
        onClick={toggleOpen}
        className="relative flex items-center justify-center w-10 h-10 rounded-xl border border-white/10 hover:bg-white/5 transition text-gray-300 hover:text-violet-400"
        aria-label="Уведомления"
        title="Уведомления"
      >
        <Bell size={18} />

        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 rounded-full bg-red-500 text-[10px] font-bold flex items-center justify-center text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />

          <div className="absolute right-0 top-full mt-2 w-80 bg-[#171726] border border-white/10 rounded-2xl p-1.5 z-40 shadow-xl max-h-[70vh] overflow-y-auto">
            <div className="flex items-center justify-between px-3 pt-2 pb-1.5">
              <span className="text-xs font-medium text-gray-500">Уведомления</span>

              {visibleItems.length > 0 && (
                <button
                  type="button"
                  onClick={closeAll}
                  className="flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-white transition"
                >
                  <X size={12} />
                  Закрыть все
                </button>
              )}
            </div>

            {visibleItems.length === 0 && (
              <div className="px-3 py-6 text-center text-sm text-gray-500">
                Пока ничего нового
              </div>
            )}

            {visibleItems.map((item) => {
              const Icon = ICONS[item.type];

              return (
                <Link
                  key={item.id}
                  href={item.url}
                  onClick={() => setOpen(false)}
                  className="w-full flex items-start gap-2.5 px-3 py-2.5 rounded-xl text-left hover:bg-white/5 transition"
                >
                  <div className="w-8 h-8 rounded-xl bg-violet-600/15 flex items-center justify-center shrink-0 mt-0.5">
                    <Icon size={14} className="text-violet-400" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{item.title}</div>
                    <div className="text-xs text-gray-500 mt-0.5 truncate">{item.body}</div>
                  </div>

                  {!seen.has(item.id) && (
                    <span className="w-2 h-2 rounded-full bg-violet-500 shrink-0 mt-2" />
                  )}
                </Link>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
