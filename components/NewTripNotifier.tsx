"use client";

import { useEffect, useRef, useState } from "react";
import { Bus, X } from "lucide-react";

type ActivityItem = {
  id: string;
  kind: "joined" | "created" | "started";
  name: string;
  routeLabel: string;
  at: string;
};

export default function NewTripNotifier() {
  const seenIds = useRef<Set<string> | null>(null);
  const [toasts, setToasts] = useState<ActivityItem[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      const res = await fetch("/api/activity", { cache: "no-store" });

      if (!res.ok || cancelled) return;

      const data = await res.json();
      const created: ActivityItem[] = (data.recent ?? []).filter(
        (item: ActivityItem) => item.kind === "created"
      );

      if (seenIds.current === null) {
        seenIds.current = new Set(created.map((c) => c.id));
        return;
      }

      const fresh = created.filter((c) => !seenIds.current!.has(c.id));

      for (const c of created) seenIds.current!.add(c.id);

      if (fresh.length > 0) {
        setToasts((prev) => [...fresh, ...prev].slice(0, 3));

        for (const c of fresh) {
          setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== c.id));
          }, 12_000);
        }
      }
    }

    poll();

    const interval = setInterval(poll, 20_000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  function dismiss(id: string) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-20 lg:bottom-4 left-4 z-50 flex flex-col gap-2 max-w-sm w-[calc(100%-2rem)]">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="bg-[#171726] border border-violet-500/30 rounded-2xl p-3.5 shadow-xl flex items-start gap-3"
        >
          <div className="w-8 h-8 rounded-xl bg-violet-600/20 flex items-center justify-center shrink-0">
            <Bus size={15} className="text-violet-400" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="text-xs font-bold">Новая поездка</div>
            <div className="text-xs text-gray-400 mt-0.5 truncate">{t.routeLabel}</div>
          </div>

          <button
            onClick={() => dismiss(t.id)}
            className="text-gray-500 hover:text-white transition shrink-0"
            aria-label="Скрыть"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
