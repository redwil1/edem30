import Link from "next/link";

import { formatDate, formatPrice, formatRating, formatSeats } from "@/lib/utils";
import { Trip } from "../types/trips";

type Props = {
  trips: Trip[];
  emptyText?: string;
};

export default function TripsList({ trips, emptyText }: Props) {
  return (
    <div className="mt-10">
      <h2 className="font-bold text-xl mb-5">Ближайшие поездки</h2>

      {trips.length === 0 && (
        <div className="text-gray-500 text-sm py-10 text-center bg-[#12121c] border border-white/5 rounded-3xl">
          {emptyText || "Поездок пока нет"}
        </div>
      )}

      <div className="space-y-4">
        {trips.map((trip) => (
          <Link key={trip.id} href={`/trip/${trip.id}`}>
            <div className="bg-[#171726] rounded-3xl p-5 border border-violet-500/10 hover:border-violet-500 hover:scale-[1.02] transition cursor-pointer">
              <div className="flex justify-between">
                <div>
                  <div className="font-bold text-lg">
                    {trip.from} → {trip.to}
                  </div>

                  <div className="text-gray-400 mt-2">📅 {formatDate(trip.date)}</div>

                  <div className="text-gray-400">🕒 {trip.time}</div>
                </div>

                <div className="text-right">
                  <div className="text-violet-400 font-bold text-2xl">
                    {formatPrice(trip.price)}
                  </div>

                  <div className="text-gray-400">{formatSeats(trip.seats)}</div>
                </div>
              </div>

              <div className="mt-6 flex justify-between items-center">
                <div>
                  <div className="font-semibold">{trip.driver}</div>

                  <div className="text-yellow-400">⭐ {formatRating(trip.rating)}</div>

                  {trip.verified && (
                    <div className="text-green-400 text-sm mt-1">
                      🛡 Проверенный перевозчик
                    </div>
                  )}
                </div>

                <button className="bg-violet-600 rounded-xl px-5 py-2 hover:bg-violet-700 transition">
                  Подробнее
                </button>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
