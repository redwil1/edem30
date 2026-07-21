"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Car, X } from "lucide-react";

import { useAuth } from "@/components/auth/AuthProvider";
import { formatPrice } from "@/lib/utils";

type Order = {
  id: number;
  from: string;
  to: string;
  price: number;
};

function beep() {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;

    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch {}
}

export default function DriverOrderNotifier() {
  const { user } = useAuth();
  const pathname = usePathname();

  const seenIds = useRef<Set<number> | null>(null);
  const [toasts, setToasts] = useState<Order[]>([]);

  useEffect(() => {
    if (!user || user.role !== "driver") {
      seenIds.current = null;
      setToasts([]);
      return;
    }

    let cancelled = false;

    async function poll() {
      const res = await fetch("/api/taxi-orders", { cache: "no-store" });
      if (!res.ok || cancelled) return;

      const data = await res.json();
      const orders: Order[] = data.orders ?? [];

      if (seenIds.current === null) {
        seenIds.current = new Set(orders.map((o) => o.id));
        return;
      }

      const fresh = orders.filter((o) => !seenIds.current!.has(o.id));

      for (const o of orders) seenIds.current!.add(o.id);

      if (fresh.length > 0 && pathname !== "/taxi") {
        setToasts((prev) => [...fresh, ...prev].slice(0, 4));
        beep();

        for (const o of fresh) {
          setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== o.id));
          }, 15000);
        }
      }
    }

    poll();

    const interval = setInterval(poll, 5000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, user?.role, pathname]);

  function dismiss(id: number) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-24 right-4 z-50 flex flex-col gap-2 max-w-sm w-[calc(100%-2rem)]">
      {toasts.map((o) => (
        <Link
          key={o.id}
          href="/taxi"
          onClick={() => dismiss(o.id)}
          className="bg-[#171726] border border-violet-500/30 rounded-2xl p-4 shadow-xl flex items-start gap-3 hover:border-violet-500 transition"
        >
          <div className="w-9 h-9 rounded-xl bg-violet-600/20 flex items-center justify-center shrink-0">
            <Car size={16} className="text-violet-400" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold">Новый заказ такси</div>

            <div className="text-xs text-gray-400 mt-0.5 truncate">
              {o.from} → {o.to}
            </div>

            <div className="text-xs text-violet-400 font-medium mt-1">
              {formatPrice(o.price)}
            </div>
          </div>

          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              dismiss(o.id);
            }}
            className="text-gray-500 hover:text-white transition shrink-0"
            aria-label="Скрыть"
          >
            <X size={16} />
          </button>
        </Link>
      ))}
    </div>
  );
}
