import Link from "next/link";
import { Car, Users } from "lucide-react";

import { formatDate, formatPrice } from "@/lib/utils";

type TripHistoryEntry = {
  id: number;
  type: "city" | "intercity";
  from: string;
  to: string;
  date: string;
  time: string;
  price: number;
  transport: string;
  role: "driver" | "passenger";
  status: "cancelled" | "completed" | "active";
};

const STATUS_LABELS: Record<TripHistoryEntry["status"], { label: string; className: string }> = {
  cancelled: { label: "Отменена", className: "bg-red-500/10 text-red-400" },
  completed: { label: "Завершена", className: "bg-green-500/10 text-green-400" },
  active: { label: "Активна", className: "bg-violet-500/10 text-violet-300" },
};

type Props = {
  trips: TripHistoryEntry[];
};

export default function TripHistoryList({ trips }: Props) {
  if (trips.length === 0) {
    return (
      <div className="bg-[#12121c] border border-white/5 rounded-2xl py-12 text-center text-gray-500 text-sm">
        Поездок пока нет
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {trips.map((trip) => {
        const status = STATUS_LABELS[trip.status];

        return (
          <Link
            key={trip.id}
            href={`/trip/${trip.id}`}
            className="block bg-[#12121c] border border-white/5 hover:border-violet-500/40 rounded-2xl p-4 transition"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="font-bold text-sm truncate">
                  {trip.from} → {trip.to}
                </div>

                <div className="text-xs text-gray-500 mt-1">
                  {formatDate(trip.date)} · {trip.time} · {trip.transport}
                </div>
              </div>

              <div className="text-right shrink-0">
                <div className="text-violet-400 font-bold text-sm">
                  {formatPrice(trip.price)}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 mt-3">
              <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full bg-white/5 text-gray-400">
                {trip.role === "driver" ? <Car size={11} /> : <Users size={11} />}
                {trip.role === "driver" ? "Водитель" : "Пассажир"}
              </span>

              <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full bg-white/5 text-gray-400">
                {trip.type === "intercity" ? "Межгород" : "По городу"}
              </span>

              <span className={`text-xs font-medium px-2 py-1 rounded-full ${status.className}`}>
                {status.label}
              </span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
