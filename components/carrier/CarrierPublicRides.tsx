"use client";

import { useEffect, useState } from "react";
import { Bus, Loader2 } from "lucide-react";

import { useAuth } from "@/components/auth/AuthProvider";

type PublicRide = {
  id: number;
  fromCity: string;
  toCity: string;
  rideDate: string;
  departureTime: string;
  price: number;
  vehicleLabel: string;
  totalSeats: number;
  freeSeats: number;
  status: string;
};

type Props = {
  slug: string;
};

function seatBadge(freeSeats: number) {
  if (freeSeats === 0) return { label: "🔴 Мест нет", className: "bg-red-500/15 text-red-400" };
  if (freeSeats === 1) return { label: "🟠 Осталось 1 место", className: "bg-orange-500/15 text-orange-400" };
  if (freeSeats <= 3)
    return { label: `🟡 Осталось ${freeSeats} места`, className: "bg-yellow-500/15 text-yellow-300" };
  return { label: `🟢 ${freeSeats} свободных мест`, className: "bg-green-500/15 text-green-400" };
}

function dateLabel(dateStr: string) {
  const today = new Date().toISOString().slice(0, 10);
  const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);

  if (dateStr === today) return "Сегодня";
  if (dateStr === tomorrow) return "Завтра";

  return new Date(`${dateStr}T00:00:00`).toLocaleDateString("ru-RU", { day: "numeric", month: "long" });
}

export default function CarrierPublicRides({ slug }: Props) {
  const { user } = useAuth();
  const [rides, setRides] = useState<PublicRide[] | null>(null);
  const [interestedId, setInterestedId] = useState<number | null>(null);
  const [pendingId, setPendingId] = useState<number | null>(null);

  useEffect(() => {
    function load() {
      fetch(`/api/carrier/${slug}/rides`, { cache: "no-store" })
        .then((res) => res.json())
        .then((data) => setRides(data.rides ?? []));
    }

    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, [slug]);

  async function wantToGo(rideId: number) {
    if (!user) {
      window.location.href = "/login";
      return;
    }

    setPendingId(rideId);

    try {
      const res = await fetch(`/api/carrier/rides/${rideId}/interest`, { method: "POST" });
      if (res.ok) setInterestedId(rideId);
    } finally {
      setPendingId(null);
    }
  }

  if (!rides) {
    return (
      <div className="py-12 flex items-center justify-center text-gray-500">
        <Loader2 size={20} className="animate-spin" />
      </div>
    );
  }

  if (rides.length === 0) {
    return (
      <div className="bg-[#12121c] border border-white/5 rounded-3xl p-6 text-center text-gray-500">
        Ближайших рейсов пока нет — загляните позже.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {rides.map((ride) => {
        const badge = seatBadge(ride.freeSeats);

        return (
          <div key={ride.id} className="bg-[#12121c] border border-white/5 rounded-3xl p-5">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <div className="text-xs text-gray-500 mb-1">{dateLabel(ride.rideDate)}</div>
                <div className="font-bold text-lg">
                  {ride.fromCity} → {ride.toCity}
                </div>
                <div className="text-violet-400 font-semibold mt-0.5">{ride.departureTime}</div>
              </div>

              <div className="text-right">
                <div className="text-xs text-gray-500 flex items-center gap-1 justify-end mb-1">
                  <Bus size={13} />
                  {ride.vehicleLabel}
                </div>
                <div className="font-bold text-xl">{ride.price} ₽</div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 mt-4 flex-wrap">
              <span
                className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-full ${badge.className}`}
              >
                {badge.label}
              </span>

              {ride.freeSeats > 0 && (
                <button
                  type="button"
                  onClick={() => wantToGo(ride.id)}
                  disabled={pendingId === ride.id || interestedId === ride.id}
                  className="btn-gradient rounded-xl px-5 py-2.5 text-sm font-bold disabled:opacity-60 transition"
                >
                  {interestedId === ride.id
                    ? "Заявка отправлена"
                    : pendingId === ride.id
                    ? "..."
                    : "Хочу поехать"}
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
