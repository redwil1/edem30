"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CircleCheck, Car, TrendingUp } from "lucide-react";

import { formatTimeAgo } from "@/lib/utils";

type ActivityItem = {
  id: string;
  kind: "joined" | "created" | "started";
  name: string;
  routeLabel: string;
  at: string;
};

type ActivityData = {
  recent: ActivityItem[];
  window: { bookedSeats: number; newTrips: number };
};

const KIND_LABEL: Record<ActivityItem["kind"], string> = {
  joined: "забронировал место",
  created: "создал поездку",
  started: "подтвердили рейс",
};

const KIND_ICON: Record<ActivityItem["kind"], typeof CircleCheck> = {
  joined: CircleCheck,
  created: Car,
  started: CircleCheck,
};

const KIND_COLOR: Record<ActivityItem["kind"], string> = {
  joined: "text-green-400",
  created: "text-violet-400",
  started: "text-green-400",
};

export default function ActivityFeed() {
  const [data, setData] = useState<ActivityData | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/activity", { cache: "no-store" });
        const json = await res.json();
        if (!cancelled) setData(json);
      } catch {
        // ignore — feed just stays as-is until next tick
      }
    }

    load();

    const interval = setInterval(load, 15_000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  if (!data || (data.recent.length === 0 && data.window.bookedSeats === 0 && data.window.newTrips === 0)) {
    return null;
  }

  return (
    <div className="bg-[#12121c] border border-white/5 rounded-3xl p-4 sm:p-5 mb-5">
      {(data.window.bookedSeats > 0 || data.window.newTrips > 0) && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm mb-4 pb-4 border-b border-white/5">
          <div className="flex items-center gap-1.5 text-gray-400">
            <TrendingUp size={14} className="text-green-400" />
            За последние 10 минут
          </div>

          {data.window.bookedSeats > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75 animate-ping" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-green-400" />
              </span>
              <span className="text-gray-300">
                забронировано <b className="text-white">{data.window.bookedSeats}</b>{" "}
                {data.window.bookedSeats === 1 ? "место" : "мест"}
              </span>
            </div>
          )}

          {data.window.newTrips > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75 animate-ping" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-green-400" />
              </span>
              <span className="text-gray-300">
                создано <b className="text-white">{data.window.newTrips}</b>{" "}
                {data.window.newTrips === 1 ? "новый рейс" : "новых рейса"}
              </span>
            </div>
          )}
        </div>
      )}

      {data.recent.length > 0 && (
        <>
          <div className="text-sm font-bold text-gray-300 mb-3">Последние действия</div>

          <div className="space-y-3">
            <AnimatePresence initial={false}>
              {data.recent.map((item, i) => {
                const Icon = KIND_ICON[item.kind];

                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: i * 0.04 }}
                    className="flex items-start gap-2.5"
                  >
                    <Icon size={15} className={`${KIND_COLOR[item.kind]} shrink-0 mt-0.5`} />

                    <div className="min-w-0">
                      <div className="text-sm text-gray-200 truncate">
                        <span className="font-medium">{item.name}</span>{" "}
                        {KIND_LABEL[item.kind]}
                      </div>

                      <div className="text-xs text-gray-500 mt-0.5">
                        {formatTimeAgo(item.at)}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </>
      )}
    </div>
  );
}
