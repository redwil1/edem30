import { Star } from "lucide-react";

import { Trip } from "@/types/trips";
import { formatDate, formatPrice, formatSeats } from "@/lib/utils";
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
        <span className="font-bold text-lg">{trip.time}</span>{" "}
        <span className="text-violet-400">{formatDate(trip.date)}</span>
      </div>

      <div className="font-bold text-2xl mt-2 leading-snug">
        {trip.from} → {trip.to}
      </div>

      <div className="text-gray-500 text-sm mt-1 leading-none">
        {trip.transport} · {trip.totalSeats} мест
      </div>

      <div className="mt-4 leading-none">
        <span className="text-violet-400 font-bold text-xl">
          {formatPrice(trip.price)}
        </span>{" "}
        <span className="text-gray-500 text-sm">с места</span>
      </div>

      <div className="flex items-center justify-between mt-5 pt-5 border-t border-white/5">
        <div className="flex items-center gap-3">
          <Avatar name={trip.driver} tone="violet" size={40} />

          <div>
            <div className="font-medium text-sm">{trip.driver}</div>

            <div className="text-xs text-yellow-400 flex items-center gap-1">
              <Star size={11} className="fill-yellow-400" />
              {trip.rating}{" "}
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
