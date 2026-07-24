"use client";

import { useState } from "react";
import Link from "next/link";
import { Bus, Car, Star, Wrench } from "lucide-react";

import LiveStats from "@/components/LiveStats";
import TripBadges from "@/components/TripBadges";
import { formatDate, formatPrice, formatRating, formatSeats } from "@/lib/utils";
import { Trip } from "@/types/trips";
import CitySwitch from "./CitySwitch";

type Mode = "intercity" | "city";

type Props = {
  trips: Trip[];
  city: string | null;
  onCityChange: (city: string | null) => void;
};

function loginHref(redirectTo: string) {
  return `/login?${new URLSearchParams({ redirect: redirectTo })}`;
}

export default function WelcomeGate({ trips, city, onCityChange }: Props) {
  const [mode, setMode] = useState<Mode>("intercity");
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const intercityHref =
    trips.length === 0
      ? loginHref("/")
      : selectedId
      ? loginHref(`/trip/${selectedId}`)
      : null;

  return (
    <section className="max-w-[720px] mx-auto px-5 sm:px-6 pt-10 sm:pt-16 pb-14">
      <div className="flex justify-center mb-5">
        <CitySwitch city={city} onChange={onCityChange} />
      </div>

      <h1 className="text-3xl sm:text-4xl font-bold text-center leading-tight">
        Куда едем?
      </h1>

      <p className="text-gray-400 text-center mt-3 max-w-md mx-auto">
        Выберите межгород или такси по городу — покажем варианты, а войти
        попросим только перед оформлением.
      </p>

      <div className="flex bg-[#171723] rounded-2xl p-1 mt-8 max-w-sm mx-auto">
        <button
          type="button"
          onClick={() => setMode("intercity")}
          className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-3 font-medium transition ${
            mode === "intercity" ? "bg-violet-600" : "text-gray-300"
          }`}
        >
          <Bus size={16} />
          Межгород
        </button>

        <button
          type="button"
          onClick={() => setMode("city")}
          className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-3 font-medium transition ${
            mode === "city" ? "bg-violet-600" : "text-gray-300"
          }`}
        >
          <Car size={16} />
          Такси
        </button>
      </div>

      <LiveStats />

      <div className="bg-[#12121c] border border-white/5 rounded-3xl p-4 sm:p-6 mt-6">
        {mode === "intercity" ? (
          <>
            {trips.length === 0 ? (
              <div className="py-10 text-center text-gray-500 text-sm">
                {city
                  ? `Поездок через «${city}» пока нет. Попробуйте выбрать другой город.`
                  : "Активных поездок пока нет. Загляните чуть позже — или войдите, чтобы разместить свою."}
              </div>
            ) : (
              <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                {trips.map((trip) => (
                  <button
                    key={trip.id}
                    type="button"
                    onClick={() => setSelectedId(trip.id)}
                    className={`w-full text-left rounded-2xl p-4 border transition ${
                      selectedId === trip.id
                        ? "border-violet-500 bg-violet-600/10"
                        : "border-white/5 bg-[#171726] hover:border-violet-500/40"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-bold">
                          {trip.from} → {trip.to}
                        </div>

                        <div className="text-xs text-gray-500 mt-1">
                          {formatDate(trip.date)} · {trip.time} ·{" "}
                          {trip.transport}
                        </div>

                        <div className="text-xs text-yellow-400 flex items-center gap-1 mt-1.5">
                          <Star size={11} className="fill-yellow-400 shrink-0" />
                          <span className="truncate">
                            {formatRating(trip.rating)} · {trip.driver}
                          </span>
                        </div>

                        <div className="mt-2">
                          <TripBadges trip={trip} />
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-violet-400 font-bold">
                          {formatPrice(trip.price)}
                        </div>

                        <div className="text-xs text-gray-500 mt-1">
                          {formatSeats(trip.seats)}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {intercityHref ? (
              <Link
                href={intercityHref}
                className="block w-full mt-5 text-center bg-violet-600 hover:bg-violet-700 transition rounded-2xl py-4 font-bold"
              >
                Поехали
              </Link>
            ) : (
              <button
                type="button"
                disabled
                className="w-full mt-5 bg-violet-600/40 text-white/60 cursor-not-allowed rounded-2xl py-4 font-bold"
              >
                Выберите поездку
              </button>
            )}
          </>
        ) : (
          <div className="py-10 text-center">
            <div className="w-12 h-12 rounded-2xl bg-violet-600/15 flex items-center justify-center mx-auto mb-4">
              <Wrench size={22} className="text-violet-400" />
            </div>

            <div className="font-bold text-lg">Сервис в разработке</div>

            <p className="text-gray-500 text-sm mt-2 max-w-xs mx-auto leading-relaxed">
              Такси по городу временно недоступно — извините за неудобство.
              Попробуйте раздел «Межгород».
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
