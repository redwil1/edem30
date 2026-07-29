"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Users, Car, Clock, Zap, UserPlus, Sparkles, Rocket } from "lucide-react";

import { formatTimeAgo } from "@/lib/utils";

type Stats = {
  driversOnline: number;
  passengersRiding: number;
  tripsToday: number;
  lastBookingAt: string | null;
  totalUsers: number;
  matchRate: number | null;
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
  {
    key: "totalUsers" as const,
    icon: UserPlus,
    color: "text-sky-400",
    dot: "bg-sky-400",
    label: "Зарегистрировано",
    value: (s: Stats) => `${s.totalUsers} пользователей`,
  },
  {
    key: "matchRate" as const,
    icon: Sparkles,
    color: "text-pink-400",
    dot: "bg-pink-400",
    label: "Находят попутчиков",
    value: (s: Stats) => (s.matchRate === null ? "—" : `${s.matchRate}%`),
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

  // Сырые счётчики ("1 водитель, 0 пассажиров") на молодом сервисе выглядят
  // как пустой сайт, а не как соц. доказательство — честнее промолчать и
  // показать мягкий призыв, чем подсвечивать, что тут почти никого нет.
  // Публикуем реальные цифры только когда они уже сами по себе убедительны.
  const looksAlive = stats.totalUsers >= 5 && stats.tripsToday >= 1;

  if (!looksAlive) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="flex items-center gap-3 bg-[#14141f] border border-white/5 rounded-2xl px-4 py-3.5 mt-6 sm:mt-8"
      >
        <Rocket size={18} className="text-violet-400 shrink-0" />
        <span className="text-sm text-gray-300">
          Едем30 только набирает обороты — станьте одним из первых
        </span>
      </motion.div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3 mt-6 sm:mt-8">
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
