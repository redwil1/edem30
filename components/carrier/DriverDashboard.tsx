"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, PhoneCall } from "lucide-react";

import SeatMap from "./SeatMap";

type Passenger = {
  id: number;
  seats: number;
  passengerName: string;
  passengerPhone: string | null;
  pickup: string | null;
  dropoff: string | null;
  comment: string | null;
  source: "operator" | "edem30";
  userId: number | null;
};

type DriverRide = {
  id: number;
  fromCity: string;
  toCity: string;
  rideDate: string;
  departureTime: string;
  vehicleLabel: string;
  totalSeats: number;
  occupiedSeats: number;
  freeSeats: number;
  status: string;
  tripId: number | null;
  passengers: Passenger[];
};

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function dateLabel(dateStr: string) {
  if (dateStr === todayStr()) return "Сегодня";
  const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
  if (dateStr === tomorrow) return "Завтра";
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString("ru-RU", { day: "numeric", month: "long" });
}

export default function DriverDashboard({ carrierName }: { carrierName: string }) {
  const [rides, setRides] = useState<DriverRide[] | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  function load() {
    fetch("/api/carrier/driver", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        setRides(data.rides ?? []);
        setSelectedId((prev) => prev ?? data.rides?.[0]?.id ?? null);
      });
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, []);

  async function tapFreeSeat(rideId: number) {
    setBusy(true);
    try {
      const res = await fetch("/api/carrier/driver/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rideId }),
      });
      if (res.ok) load();
      else {
        const err = await res.json().catch(() => null);
        alert(err?.error ?? "Не удалось занять место");
      }
    } finally {
      setBusy(false);
    }
  }

  async function cancelPassenger(bookingId: number) {
    if (!confirm("Убрать пассажира с рейса?")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/carrier/driver/bookings/${bookingId}/cancel`, { method: "POST" });
      if (res.ok) load();
    } finally {
      setBusy(false);
    }
  }

  async function setStatus(rideId: number, status: "departed" | "arrived" | "completed") {
    setBusy(true);
    try {
      const res = await fetch(`/api/carrier/driver/rides/${rideId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) load();
    } finally {
      setBusy(false);
    }
  }

  if (!rides) {
    return (
      <div className="py-16 flex items-center justify-center text-gray-500">
        <Loader2 size={20} className="animate-spin" />
      </div>
    );
  }

  if (rides.length === 0) {
    return (
      <div className="bg-[#12121c] border border-white/5 rounded-3xl p-6 text-center text-gray-400">
        На сегодня и завтра рейсов, назначенных вам, нет. Обратитесь к менеджеру перевозчика.
      </div>
    );
  }

  const ride = rides.find((r) => r.id === selectedId) ?? rides[0];

  return (
    <div>
      <h1 className="text-xl font-bold mb-1">{carrierName}</h1>
      <p className="text-gray-500 text-sm mb-6">Кабинет водителя</p>

      {rides.length > 1 && (
        <div className="flex gap-2 overflow-x-auto mb-5 pb-1">
          {rides.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setSelectedId(r.id)}
              className={`whitespace-nowrap rounded-xl px-3.5 py-2 text-sm font-medium transition ${
                r.id === ride.id ? "bg-violet-600 text-white" : "bg-[#12121c] border border-white/5 text-gray-400"
              }`}
            >
              {dateLabel(r.rideDate)} {r.departureTime}
            </button>
          ))}
        </div>
      )}

      <div className="bg-[#12121c] border border-white/5 rounded-3xl p-5 mb-5">
        <div className="text-xs text-gray-500 mb-1">
          {dateLabel(ride.rideDate)} · {ride.vehicleLabel}
        </div>
        <div className="text-violet-400 font-bold text-2xl">{ride.departureTime}</div>
        <div className="font-bold text-xl mt-1">
          {ride.fromCity} → {ride.toCity}
        </div>
        <div className="text-gray-400 text-sm mt-2">
          Занято: <span className="text-white font-bold">{ride.occupiedSeats}</span> / {ride.totalSeats} · Свободно:{" "}
          <span className="text-white font-bold">{ride.freeSeats}</span>
        </div>

        <div className="flex gap-2 mt-4">
          {(ride.status === "open" || ride.status === "full") && (
            <button
              type="button"
              onClick={() => setStatus(ride.id, "departed")}
              disabled={busy}
              className="flex-1 btn-gradient rounded-xl py-3 text-sm font-bold disabled:opacity-60"
            >
              Выехали
            </button>
          )}
          {ride.status === "departed" && (
            <>
              <button
                type="button"
                onClick={() => setStatus(ride.id, "arrived")}
                disabled={busy}
                className="flex-1 bg-[#1c1c2b] hover:bg-white/10 transition rounded-xl py-3 text-sm font-bold disabled:opacity-60"
              >
                Прибыли
              </button>
              <button
                type="button"
                onClick={() => setStatus(ride.id, "completed")}
                disabled={busy}
                className="flex-1 bg-green-600 hover:bg-green-700 transition rounded-xl py-3 text-sm font-bold disabled:opacity-60"
              >
                Завершить рейс
              </button>
            </>
          )}
          {ride.status === "completed" && (
            <div className="flex-1 text-center text-green-400 text-sm font-bold py-3">✓ Рейс завершён</div>
          )}
        </div>
      </div>

      <div className="mb-5">
        <SeatMap
          totalSeats={ride.totalSeats}
          occupiedSeats={ride.occupiedSeats}
          disabled={busy || ride.status === "departed" || ride.status === "completed"}
          onTapFreeSeat={() => tapFreeSeat(ride.id)}
        />
      </div>

      <div className="text-sm font-bold mb-2">Пассажиры ({ride.passengers.length})</div>

      {ride.passengers.length === 0 ? (
        <div className="text-gray-500 text-sm">Пока никого нет</div>
      ) : (
        <div className="space-y-2">
          {ride.passengers.map((p) => (
            <div key={p.id} className="bg-[#12121c] border border-white/5 rounded-2xl px-4 py-3">
              <div className="flex items-center justify-between gap-2">
                <div className="font-medium text-sm">
                  {p.userId ? (
                    <Link href={`/profile/${p.userId}`} className="hover:text-violet-400 transition">
                      {p.passengerName}
                    </Link>
                  ) : (
                    p.passengerName
                  )}{" "}
                  <span className="text-gray-500 font-normal">· {p.seats} мест</span>
                </div>
                <span
                  className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full whitespace-nowrap ${
                    p.source === "edem30" ? "bg-violet-600/20 text-violet-300" : "bg-white/10 text-gray-400"
                  }`}
                >
                  {p.source === "edem30" ? "🌐 Едем30" : "📞 Оператор"}
                </span>
              </div>

              {p.passengerPhone && (
                <a
                  href={`tel:${p.passengerPhone}`}
                  className="flex items-center gap-1.5 text-violet-400 text-xs mt-1.5"
                >
                  <PhoneCall size={12} />
                  {p.passengerPhone}
                </a>
              )}

              {(p.pickup || p.dropoff) && (
                <div className="text-gray-500 text-xs mt-1">
                  {p.pickup && `Откуда: ${p.pickup}`}
                  {p.pickup && p.dropoff && " · "}
                  {p.dropoff && `Куда: ${p.dropoff}`}
                </div>
              )}
              {p.comment && <div className="text-gray-500 text-xs mt-1">💬 {p.comment}</div>}

              <button
                type="button"
                onClick={() => cancelPassenger(p.id)}
                disabled={busy}
                className="text-red-400 hover:text-red-300 text-xs font-medium mt-2 disabled:opacity-50"
              >
                Убрать с рейса
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
