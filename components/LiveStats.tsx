"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Users, Car, Clock, Zap } from "lucide-react";

import { formatTimeAgo } from "@/lib/utils";

type Stats = {
  driversOnline: number;
  passengersRiding: number;
  tripsToday: number;
  lastBookingAt: string | null;
};

const CARD_DEFS = [
  {
    key: "drivers" as const,
    icon: Car,
    color: "text-green-400",
    dot: "bg-green-400",
    label: "Сейчас онлайн",
    value: (s: Stats) => `${s.driversOnline} водителей`,
  },
  {
    key: "riding" as const,
    icon: Users,
    color: "text-violet-400",
    dot: "bg-violet-400",
    label: "Уже едут",
    value: (s: Stats) => `${s.passengersRiding} пассажиров`,
  },
  {
    key: "today" as const,
    icon: Clock,
    color: "text-orange-400",
    dot: "bg-orange-400",
    label: "Поездок сегодня",
    value: (s: Stats) => `${s.tripsToday}`,
  },
  {
    key: "lastBooking" as const,
    icon: Zap,
    color: "text-yellow-400",
    dot: "bg-yellow-400",
    label: "Последнее бронирование",
    value: (s: Stats) => formatTimeAgo(s.lastBookingAt),
  },
];

export default function LiveStats() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/live-stats", { cache: "no-store" });
        const data = await res.json();
        if (!cancelled) setStats(data);
      } catch {
        // silently ignore — bar just stays hidden until next tick
      }
    }

    load();

    const interval = setInterval(load, 15_000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  if (!stats) return null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 mt-6 sm:mt-8">
      {CARD_DEFS.map((def, i) => {
        const Icon = def.icon;

        return (
          <motion.div
            key={def.key}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: i * 0.06 }}
            whileHover={{ scale: 1.02 }}
            className="relative overflow-hidden bg-[#14141f] border border-white/5 rounded-2xl px-3.5 py-3 sm:px-4 sm:py-3.5 cursor-default"
          >
            <div
              className={`absolute -top-6 -right-6 w-16 h-16 rounded-full ${def.dot} opacity-10 blur-xl`}
            />

            <div className="flex items-center gap-1.5 text-[11px] sm:text-xs text-gray-500 mb-1.5">
              <span className={`relative flex h-1.5 w-1.5 shrink-0`}>
                <span
                  className={`absolute inline-flex h-full w-full rounded-full ${def.dot} opacity-75 animate-ping`}
                />
                <span className={`relative inline-flex h-1.5 w-1.5 rounded-full ${def.dot}`} />
              </span>
              {def.label}
            </div>

            <div className="flex items-center gap-1.5">
              <Icon size={15} className={`${def.color} shrink-0`} />
              <span className="font-bold text-sm sm:text-base leading-none truncate">
                {def.value(stats)}
              </span>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
