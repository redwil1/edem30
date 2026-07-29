import { Car } from "lucide-react";

import { formatDate } from "@/lib/utils";
import { formingStatusText, HOT_THRESHOLD } from "@/lib/rideRequestStatusText";

export type FormingCluster = {
  from: string;
  to: string;
  date: string;
  time: string;
  waitingCount: number;
  requestIds: number[];
  passengers: {
    id: number;
    name: string;
    count: number;
    comment: string | null;
  }[];
};

function PassengerDots({ count }: { count: number }) {
  const shown = Math.min(count, 6);

  return (
    <span className="text-base leading-none">
      {"👤".repeat(shown)}
      {count > shown && <span className="text-xs text-gray-500 ml-1">+{count - shown}</span>}
    </span>
  );
}

export default function FormingTripCard({
  cluster,
  action,
}: {
  cluster: FormingCluster;
  action?: React.ReactNode;
}) {
  const isHot = cluster.waitingCount >= HOT_THRESHOLD;

  return (
    <div
      className={`bg-[#12121c] border rounded-3xl p-5 transition ${
        isHot ? "border-orange-500/40" : "border-white/5"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs text-gray-500 mb-1.5">
            <Car size={13} className="text-violet-400" />
            Формируется поездка
          </div>

          <div className="font-bold text-xl">
            {cluster.from} → {cluster.to}
          </div>

          <div className="text-sm text-gray-500 mt-1">
            {formatDate(cluster.date)} · {cluster.time}
          </div>
        </div>

        {isHot && (
          <span className="shrink-0 flex items-center gap-1 text-xs font-bold text-orange-400 bg-orange-500/10 border border-orange-500/30 rounded-full px-2.5 py-1 whitespace-nowrap">
            🔥 Почти собрана
          </span>
        )}
      </div>

      <div className="flex items-center gap-2.5 mt-4">
        <PassengerDots count={cluster.waitingCount} />
        <div className="text-sm">
          <div className="font-medium">
            Ждут {cluster.waitingCount} {pluralPassengers(cluster.waitingCount)}
          </div>
          <div className="text-xs text-gray-500">{formingStatusText(cluster.waitingCount)}</div>
        </div>
      </div>

      {cluster.passengers.some((p) => p.comment) && (
        <div className="mt-3 space-y-1">
          {cluster.passengers
            .filter((p) => p.comment)
            .map((p) => (
              <div key={p.id} className="text-xs text-gray-400">
                <span className="text-gray-500">{p.name}:</span> {p.comment}
              </div>
            ))}
        </div>
      )}

      {action && <div className="mt-4 pt-4 border-t border-white/5">{action}</div>}
    </div>
  );
}

function pluralPassengers(count: number) {
  const mod10 = count % 10;
  const mod100 = count % 100;

  if (mod10 === 1 && mod100 !== 11) return "пассажир";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return "пассажира";
  return "пассажиров";
}
