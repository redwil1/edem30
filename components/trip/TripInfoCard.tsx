import { Star } from "lucide-react";

import { Trip } from "@/types/trips";
import { formatDate, formatPrice, formatRating, formatSeats } from "@/lib/utils";
import Avatar from "./Avatar";
import JoinButton from "./JoinButton";

type Props = {
  trip: Trip;
  joined: boolean;
};

export default function TripInfoCard({ trip, joined }: Props) {
  return (
    <div className="bg-[#12121c] border border-white/5 rounded-3xl p-4 sm:p-6">
      <div className="text-sm leading-none">
        <span className="font-display font-bold text-lg">{trip.time}</span>{" "}
        <span className="text-violet-400">{formatDate(trip.date)}</span>
      </div>

      <div className="font-bold text-2xl mt-2 leading-snug">
        {trip.from} → {trip.to}
      </div>

      <div className="text-gray-500 text-sm mt-1 leading-none">
        {trip.transport}
        {trip.carModel ? ` · ${trip.carModel}` : ""} · {trip.totalSeats} мест
      </div>

      {trip.licensePlate && (
        <span className="inline-block bg-[#1c1c2b] border border-white/10 rounded-lg px-2 py-1 text-xs font-mono tracking-wide mt-2">
          {trip.licensePlate}
        </span>
      )}

      <div className="mt-4 leading-none">
        <span className="font-display text-violet-400 font-bold text-xl">
          {formatPrice(trip.price)}
        </span>{" "}
        <span className="text-gray-500 text-sm">с места</span>
      </div>

      <div className="flex items-center justify-between mt-5 pt-5 border-t border-white/5">
        <div className="flex items-center gap-3">
          <Avatar name={trip.driver} size={40} avatarUrl={trip.driverAvatarUrl} />

          <div>
            <div className="font-medium text-sm">{trip.driver}</div>

            <div className="text-xs text-yellow-400 flex items-center gap-1">
              <Star size={11} className="fill-yellow-400" />
              {formatRating(trip.rating)}{" "}
              <span className="text-gray-500">({trip.tripsCount} отзывов)</span>
            </div>
          </div>
        </div>

        <span className="bg-violet-600/15 text-violet-300 text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap">
          {formatSeats(trip.seats)}
        </span>
      </div>

      <JoinButton tripId={trip.id} joined={joined} />
    </div>
  );
}
