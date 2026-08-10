import Link from "next/link";
import { MapPin, Star } from "lucide-react";

import { Trip } from "@/types/trips";
import { formatDate, formatPrice, formatRating, formatSeats } from "@/lib/utils";
import Avatar from "./Avatar";
import JoinButton from "./JoinButton";

type Props = {
  trip: Trip;
  joined: boolean;
  hideJoin?: boolean;
};

export default function TripInfoCard({ trip, joined, hideJoin }: Props) {
  // Формирующаяся поездка ("Ищу водителя") ещё не имеет водителя, driver_name
  // у неё пустой. Не путать с историческими поездками, где владелец был
  // удалён (owner_id тоже NULL, но driver_name сохранён) — те не "формируются".
  const isForming = trip.driverId === null && trip.driver === "";

  return (
    <div className="bg-[#12121c] border border-white/5 rounded-3xl p-4 sm:p-6">
      {isForming && (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap bg-yellow-500/15 text-yellow-400 border border-yellow-500/20 mb-3">
          🟡 Ищем водителя
        </span>
      )}

      <div className="text-sm leading-none">
        <span className="font-display font-bold text-lg">{trip.time}</span>{" "}
        <span className="text-violet-400">{formatDate(trip.date)}</span>
      </div>

      <div className="font-bold text-2xl mt-2 leading-snug">
        {trip.from} → {trip.to}
      </div>

      {trip.pickupLocation && (
        <div className="flex items-center gap-1.5 text-sm text-gray-400 mt-1.5">
          <MapPin size={14} className="text-violet-400 shrink-0" />
          Место посадки: {trip.pickupLocation}
        </div>
      )}

      {isForming ? (
        <div className="text-gray-500 text-sm mt-1 leading-none">
          {trip.totalSeats} {trip.totalSeats === 1 ? "пассажир" : "пассажиров"} ищут поездку
        </div>
      ) : (
        <div className="text-gray-500 text-sm mt-1 leading-none">
          {trip.transport}
          {trip.carModel ? ` · ${trip.carModel}` : ""} · {trip.totalSeats} мест
        </div>
      )}

      {trip.licensePlate && (
        <span className="inline-block bg-[#1c1c2b] border border-white/10 rounded-lg px-2 py-1 text-xs font-mono tracking-wide mt-2">
          {trip.licensePlate}
        </span>
      )}

      {isForming ? (
        <div className="mt-4 leading-none text-gray-500 text-sm">
          Цену и место назначит водитель, когда присоединится
        </div>
      ) : (
        <div className="mt-4 leading-none">
          <span className="font-display text-violet-400 font-bold text-xl">
            {formatPrice(trip.price)}
          </span>{" "}
          <span className="text-gray-500 text-sm">с места</span>
        </div>
      )}

      <div className="flex items-center justify-between mt-5 pt-5 border-t border-white/5">
        {isForming ? (
          <div className="text-sm text-gray-400">Водитель ещё не найден</div>
        ) : (
          <Link
            href={`/profile/${trip.driverId}`}
            className="flex items-center gap-3 hover:opacity-80 transition"
          >
            <Avatar
              name={trip.driver}
              size={40}
              avatarUrl={trip.driverAvatarUrl}
              avatarPreset={trip.driverAvatarPreset}
            />

            <div>
              <div className="font-medium text-sm">{trip.driver}</div>

              <div className="text-xs text-yellow-400 flex items-center gap-1">
                <Star size={11} className="fill-yellow-400" />
                {formatRating(trip.rating)}{" "}
                <span className="text-gray-500">({trip.tripsCount} отзывов)</span>
              </div>
            </div>
          </Link>
        )}

        <span className="bg-violet-600/15 text-violet-300 text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap">
          {formatSeats(trip.seats)}
        </span>
      </div>

      {!hideJoin && <JoinButton tripId={trip.id} joined={joined} />}
    </div>
  );
}
