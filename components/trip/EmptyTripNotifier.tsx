"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";

import { useAuth } from "@/components/auth/AuthProvider";

type Warning = {
  tripId: number;
  route: string;
  minutesUntil: number;
};

export default function EmptyTripNotifier() {
  const { user } = useAuth();

  const [warnings, setWarnings] = useState<Warning[]>([]);
  const [dismissedIds, setDismissedIds] = useState<number[]>([]);

  useEffect(() => {
    if (!user || user.role !== "driver") {
      setWarnings([]);
      return;
    }

    let cancelled = false;

    async function poll() {
      const res = await fetch("/api/notifications/empty-trips", {
        cache: "no-store",
      });

      if (!res.ok || cancelled) return;

      const data = await res.json();
      setWarnings(data.warnings ?? []);
    }

    poll();

    const interval = setInterval(poll, 30_000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [user]);

  const visible = warnings.filter((w) => !dismissedIds.includes(w.tripId));

  if (visible.length === 0) return null;

  return (
    <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-md flex flex-col gap-2">
      {visible.map((w) => (
        <div
          key={w.tripId}
          className="bg-[#171726] border border-red-500/30 rounded-2xl p-4 shadow-xl flex items-start gap-3"
        >
          <div className="w-9 h-9 rounded-xl bg-red-500/15 flex items-center justify-center shrink-0 text-lg">
            😢
          </div>

          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold">
              Попутчиков пока нет
            </div>

            <div className="text-xs text-gray-400 mt-0.5 truncate">{w.route}</div>

            <div className="text-xs text-gray-400 mt-1">
              Поездка закроется автоматически через{" "}
              {w.minutesUntil === 0 ? "меньше минуты" : `${w.minutesUntil} мин`}
            </div>

            <Link
              href={`/trip/${w.tripId}`}
              className="inline-block text-xs font-medium text-violet-400 hover:text-violet-300 transition mt-2.5"
            >
              Открыть поездку
            </Link>
          </div>

          <button
            onClick={() => setDismissedIds((prev) => [...prev, w.tripId])}
            className="text-gray-500 hover:text-white transition shrink-0"
            aria-label="Скрыть"
          >
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}
