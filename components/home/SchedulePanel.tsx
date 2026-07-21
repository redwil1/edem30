"use client";

import { useState } from "react";
import Link from "next/link";
import { Calendar, MessageCircle, Star } from "lucide-react";

import { formatPrice, formatSeats } from "@/lib/utils";
import { Trip } from "@/types/trips";

type Props = {
  trips: Trip[];
};

export default function SchedulePanel({ trips }: Props) {
  const [tab, setTab] = useState<"schedule" | "chat">("schedule");

  return (
    <div
      id="schedule"
      className="bg-[#12121c] border border-white/5 rounded-3xl p-4 sm:p-6 scroll-mt-24"
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
        <div className="flex items-center gap-2 font-bold text-lg">
          <Calendar size={18} className="text-violet-400 shrink-0" />
          Межгород
        </div>

        <div className="flex bg-[#1c1c2b] rounded-xl p-1 text-sm">
          <button
            onClick={() => setTab("schedule")}
            className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-lg font-medium transition whitespace-nowrap ${
              tab === "schedule"
                ? "bg-violet-600 text-white"
                : "text-gray-400 hover:text-white"
            }`}
          >
            Расписание
          </button>

          <button
            onClick={() => setTab("chat")}
            className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-lg font-medium transition flex items-center justify-center gap-1.5 whitespace-nowrap ${
              tab === "chat"
                ? "bg-violet-600 text-white"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <MessageCircle size={14} className="shrink-0" />
            Чат попутчиков
          </button>
        </div>
      </div>

      {tab === "schedule" ? (
        <div>
          {trips.length === 0 && (
            <div className="py-16 text-center text-gray-500 text-sm">
              Рейсов пока нет. Будьте первым, кто их предложит.
            </div>
          )}

          {trips.map((trip) => (
            <Link
              key={trip.id}
              href={`/trip/${trip.id}`}
              className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 py-4 sm:py-5 border-b border-white/5 last:border-0 hover:bg-white/[0.02] -mx-2 px-2 rounded-xl transition"
            >
              <div>
                <div className="text-sm leading-none">
                  <span className="font-bold">{trip.time}</span>{" "}
                  <span className="text-violet-400">{trip.date}</span>
                </div>

                <div className="font-bold text-lg mt-2 leading-snug">
                  {trip.from} → {trip.to}
                </div>

                <div className="text-gray-500 text-sm mt-1 leading-none">
                  {trip.transport} · {trip.totalSeats} мест
                </div>
              </div>

              <div className="flex items-center justify-between sm:flex-col sm:items-end gap-3 sm:gap-2.5">
                <span className="bg-violet-600/15 text-violet-300 text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap leading-none">
                  {formatSeats(trip.seats)}
                </span>

                <div className="flex items-center gap-4 sm:gap-5">
                  <div className="text-right leading-none">
                    <div className="text-violet-400 font-bold text-lg">
                      {formatPrice(trip.price)}
                    </div>

                    <div className="text-gray-500 text-xs mt-1.5">
                      с места
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-full bg-violet-600/30 border border-violet-500/30 flex items-center justify-center text-xs font-bold text-violet-200 shrink-0">
                      {trip.driver
                        .split(" ")
                        .map((p) => p[0])
                        .join("")
                        .slice(0, 2)}
                    </div>

                    <div className="hidden xl:block leading-none">
                      <div className="text-sm font-medium whitespace-nowrap">
                        {trip.driver}
                      </div>

                      <div className="text-xs text-yellow-400 flex items-center gap-1 mt-1.5">
                        <Star size={11} className="fill-yellow-400 shrink-0" />
                        {trip.rating}{" "}
                        <span className="text-gray-500">
                          ({trip.tripsCount} отзывов)
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}

          <button className="w-full mt-4 py-3 rounded-xl border border-white/10 text-sm text-gray-300 hover:bg-white/5 transition flex items-center justify-center gap-1">
            Смотреть все рейсы →
          </button>
        </div>
      ) : (
        <div className="py-16 text-center text-gray-500 text-sm">
          Выберите поездку в расписании, чтобы открыть чат попутчиков.
        </div>
      )}
    </div>
  );
}
