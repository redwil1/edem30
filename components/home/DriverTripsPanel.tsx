"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bus, Loader2, Plus, Repeat } from "lucide-react";

import { formatDate, formatPrice, formatSeats } from "@/lib/utils";

type OwnedTrip = {
  id: number;
  type: "city" | "intercity";
  from: string;
  to: string;
  date: string;
  time: string;
  price: number;
  seats: number;
  totalSeats: number;
  transport: string;
  transportCategory: string | null;
  carModel: string | null;
  licensePlate: string | null;
  cancelled: boolean;
  completed: boolean;
};

function repeatHref(trip: OwnedTrip) {
  const params = new URLSearchParams({
    type: trip.type,
    from: trip.from,
    to: trip.to,
    price: String(trip.price),
    totalSeats: String(trip.totalSeats),
  });

  if (trip.transportCategory) params.set("transportCategory", trip.transportCategory);
  if (trip.carModel) params.set("carModel", trip.carModel);
  if (trip.licensePlate) params.set("licensePlate", trip.licensePlate);

  return `/create-trip?${params.toString()}`;
}

export default function DriverTripsPanel() {
  const [trips, setTrips] = useState<OwnedTrip[] | null>(null);

  async function load() {
    const res = await fetch("/api/trips/mine", { cache: "no-store" });
    const data = await res.json();
    setTrips(data.trips ?? []);
  }

  useEffect(() => {
    load();

    const interval = setInterval(load, 8000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between gap-4 mb-5">
        <div className="flex items-center gap-2 font-bold text-lg">
          <Bus size={18} className="text-violet-400" />
          Мои поездки по расписанию
        </div>

        <Link
          href="/create-trip"
          className="flex items-center gap-1.5 bg-violet-600 hover:bg-violet-700 transition rounded-xl px-4 py-2.5 text-sm font-bold whitespace-nowrap"
        >
          <Plus size={15} />
          Добавить поездку
        </Link>
      </div>

      {!trips ? (
        <div className="py-16 flex items-center justify-center text-gray-500">
          <Loader2 size={20} className="animate-spin" />
        </div>
      ) : trips.length === 0 ? (
        <div className="bg-[#12121c] border border-white/5 rounded-3xl p-10 text-center text-gray-500 text-sm">
          Вы ещё не разместили ни одной поездки по расписанию — межгород или
          по городу.
        </div>
      ) : (
        <div className="space-y-4">
          {trips.map((trip) => (
            <div
              key={trip.id}
              className="bg-[#12121c] border border-white/5 hover:border-violet-500/40 rounded-3xl p-5 transition"
            >
              <Link href={`/trip/${trip.id}`} className="block">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="font-bold">
                      {trip.from} → {trip.to}
                    </div>

                    <div className="text-sm text-gray-500 mt-1">
                      {formatDate(trip.date)} · {trip.time} · {trip.transport}
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
              </Link>

              <div className="flex items-center justify-between gap-3 mt-3">
                {trip.cancelled || trip.completed ? (
                  <span
                    className={`inline-block text-xs font-medium px-2.5 py-1 rounded-full ${
                      trip.cancelled
                        ? "bg-red-500/10 text-red-400"
                        : "bg-green-500/10 text-green-400"
                    }`}
                  >
                    {trip.cancelled ? "Отменена" : "Завершена"}
                  </span>
                ) : (
                  <span />
                )}

                <Link
                  href={repeatHref(trip)}
                  className="flex items-center gap-1.5 text-xs font-medium text-violet-400 hover:text-violet-300 transition"
                >
                  <Repeat size={12} />
                  Повторить
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
