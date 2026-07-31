"use client";

import { useEffect, useState } from "react";
import { Loader2, Search, X } from "lucide-react";

type Ride = {
  id: number;
  fromCity: string;
  toCity: string;
  rideDate: string;
  departureTime: string;
  price: number;
  vehicleLabel: string;
  totalSeats: number;
  occupiedSeats: number;
  freeSeats: number;
  status: string;
};

type Booking = {
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

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function withCarrierId(url: string, carrierId?: number) {
  if (!carrierId) return url;
  return `${url}${url.includes("?") ? "&" : "?"}carrierId=${carrierId}`;
}

export default function BookingsTab({
  carrierId,
  rides,
  readOnly,
  preselectedRideId,
  onConsumePreselect,
  onChanged,
}: {
  carrierId?: number;
  rides: Ride[];
  readOnly: boolean;
  preselectedRideId: number | null;
  onConsumePreselect: () => void;
  onChanged: () => void;
}) {
  const [date, setDate] = useState(todayStr());
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<Ride[] | null>(null);
  const [selectedRide, setSelectedRide] = useState<Ride | null>(null);

  const [bookings, setBookings] = useState<Booking[] | null>(null);
  const [cancellingId, setCancellingId] = useState<number | null>(null);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [pickup, setPickup] = useState("");
  const [dropoff, setDropoff] = useState("");
  const [comment, setComment] = useState("");
  const [seats, setSeats] = useState("1");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (preselectedRideId === null) return;
    const ride = rides.find((r) => r.id === preselectedRideId);
    if (ride) setSelectedRide(ride);
    onConsumePreselect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preselectedRideId]);

  function loadBookings(rideId: number) {
    setBookings(null);
    fetch(withCarrierId(`/api/carrier/dashboard/rides/${rideId}/passengers`, carrierId), { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => setBookings(data.bookings ?? []));
  }

  useEffect(() => {
    if (selectedRide) loadBookings(selectedRide.id);
  }, [selectedRide]);

  async function search(e?: React.FormEvent) {
    e?.preventDefault();
    setSearching(true);

    try {
      const params = new URLSearchParams({ date });
      if (from) params.set("from", from);
      if (to) params.set("to", to);

      const res = await fetch(withCarrierId(`/api/carrier/dashboard/rides/search?${params.toString()}`, carrierId), {
        cache: "no-store",
      });
      const data = await res.json();
      setResults(data.rides ?? []);
    } finally {
      setSearching(false);
    }
  }

  useEffect(() => {
    search();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submitBooking(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedRide) return;

    setError("");
    setSaving(true);

    try {
      const res = await fetch(withCarrierId("/api/carrier/dashboard/bookings", carrierId), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rideId: selectedRide.id,
          seats: Number(seats),
          passengerName: name,
          passengerPhone: phone || undefined,
          pickup: pickup || undefined,
          dropoff: dropoff || undefined,
          comment: comment || undefined,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setError(data?.error ?? "Не удалось создать бронь");
        return;
      }

      setName("");
      setPhone("");
      setPickup("");
      setDropoff("");
      setComment("");
      setSeats("1");
      loadBookings(selectedRide.id);
      search();
      onChanged();
    } finally {
      setSaving(false);
    }
  }

  async function cancelBooking(bookingId: number) {
    if (!selectedRide) return;
    setCancellingId(bookingId);

    try {
      const res = await fetch(withCarrierId(`/api/carrier/dashboard/bookings/${bookingId}/cancel`, carrierId), {
        method: "POST",
      });
      if (res.ok) {
        loadBookings(selectedRide.id);
        search();
        onChanged();
      }
    } finally {
      setCancellingId(null);
    }
  }

  return (
    <div>
      {!selectedRide ? (
        <>
          <form onSubmit={search} className="bg-[#12121c] border border-white/5 rounded-3xl p-5 mb-5 space-y-3">
            <div className="flex items-center gap-2 font-bold mb-1">
              <Search size={16} className="text-violet-400" />
              Найти рейс
            </div>

            <div className="flex gap-2 flex-wrap">
              <input
                value={date}
                onChange={(e) => setDate(e.target.value)}
                type="date"
                required
                className="bg-[#1c1c2b] rounded-xl px-3 py-2.5 text-sm outline-none"
              />
              <input
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                placeholder="Откуда (необязательно)"
                className="flex-1 min-w-[140px] bg-[#1c1c2b] rounded-xl px-3 py-2.5 text-sm outline-none"
              />
              <input
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="Куда (необязательно)"
                className="flex-1 min-w-[140px] bg-[#1c1c2b] rounded-xl px-3 py-2.5 text-sm outline-none"
              />
              <button
                type="submit"
                disabled={searching}
                className="btn-gradient rounded-xl px-5 py-2.5 text-sm font-bold disabled:opacity-60"
              >
                Найти
              </button>
            </div>
          </form>

          {searching && !results ? (
            <div className="py-12 flex items-center justify-center text-gray-500">
              <Loader2 size={20} className="animate-spin" />
            </div>
          ) : results && results.length === 0 ? (
            <div className="bg-[#12121c] border border-white/5 rounded-3xl p-6 text-center text-gray-500">
              На эту дату/маршрут рейсов нет
            </div>
          ) : (
            <div className="space-y-3">
              {(results ?? []).map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setSelectedRide(r)}
                  className="w-full flex items-center justify-between gap-3 bg-[#12121c] border border-white/5 hover:border-violet-500/30 rounded-3xl p-5 text-left transition"
                >
                  <div>
                    <div className="text-violet-400 font-bold">{r.departureTime}</div>
                    <div className="font-medium">
                      {r.fromCity} → {r.toCity}
                    </div>
                    <div className="text-gray-500 text-xs mt-0.5">
                      {r.vehicleLabel} · {r.price} ₽
                    </div>
                  </div>
                  <div
                    className={`text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap ${
                      r.freeSeats > 0 ? "bg-green-500/15 text-green-400" : "bg-red-500/15 text-red-400"
                    }`}
                  >
                    {r.freeSeats > 0 ? `Свободно ${r.freeSeats}` : "Мест нет"}
                  </div>
                </button>
              ))}
            </div>
          )}
        </>
      ) : (
        <div>
          <div className="flex items-center justify-between gap-3 mb-5">
            <div>
              <div className="text-violet-400 font-bold">{selectedRide.departureTime}</div>
              <div className="font-bold text-lg">
                {selectedRide.fromCity} → {selectedRide.toCity}
              </div>
              <div className="text-gray-500 text-sm mt-0.5">
                {selectedRide.vehicleLabel} · {selectedRide.occupiedSeats}/{selectedRide.totalSeats} мест ·{" "}
                {selectedRide.price} ₽
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSelectedRide(null)}
              className="w-9 h-9 rounded-full flex items-center justify-center text-gray-400 hover:bg-white/5 transition shrink-0"
              aria-label="Назад к поиску"
            >
              <X size={18} />
            </button>
          </div>

          {!readOnly && (
            <form onSubmit={submitBooking} className="bg-[#12121c] border border-white/5 rounded-3xl p-5 mb-5 space-y-3">
              <div className="font-bold mb-1">+ Новая бронь</div>

              <div className="flex gap-2 flex-wrap">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Имя / фамилия"
                  required
                  className="flex-1 min-w-[160px] bg-[#1c1c2b] rounded-xl px-3 py-2.5 text-sm outline-none"
                />
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Телефон"
                  className="flex-1 min-w-[140px] bg-[#1c1c2b] rounded-xl px-3 py-2.5 text-sm outline-none"
                />
                <input
                  value={seats}
                  onChange={(e) => setSeats(e.target.value)}
                  type="number"
                  min={1}
                  max={selectedRide.freeSeats || 1}
                  required
                  className="w-24 bg-[#1c1c2b] rounded-xl px-3 py-2.5 text-sm outline-none"
                />
              </div>

              <div className="flex gap-2 flex-wrap">
                <input
                  value={pickup}
                  onChange={(e) => setPickup(e.target.value)}
                  placeholder="Откуда забрать"
                  className="flex-1 min-w-[140px] bg-[#1c1c2b] rounded-xl px-3 py-2.5 text-sm outline-none"
                />
                <input
                  value={dropoff}
                  onChange={(e) => setDropoff(e.target.value)}
                  placeholder="Куда высадить"
                  className="flex-1 min-w-[140px] bg-[#1c1c2b] rounded-xl px-3 py-2.5 text-sm outline-none"
                />
              </div>

              <input
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Комментарий (необязательно)"
                className="w-full bg-[#1c1c2b] rounded-xl px-3 py-2.5 text-sm outline-none"
              />

              {error && <p className="text-red-400 text-sm">{error}</p>}

              <button
                type="submit"
                disabled={saving || selectedRide.freeSeats <= 0}
                className="btn-gradient rounded-xl px-5 py-2.5 text-sm font-bold disabled:opacity-60"
              >
                {selectedRide.freeSeats <= 0 ? "Мест нет" : saving ? "..." : "Забронировать"}
              </button>
            </form>
          )}

          <div className="text-sm font-bold mb-2">Пассажиры рейса</div>

          {!bookings ? (
            <div className="py-8 flex items-center justify-center text-gray-500">
              <Loader2 size={18} className="animate-spin" />
            </div>
          ) : bookings.length === 0 ? (
            <div className="text-gray-500 text-sm">Пока никто не забронирован</div>
          ) : (
            <div className="space-y-2">
              {bookings.map((b) => (
                <div key={b.id} className="bg-[#12121c] border border-white/5 rounded-2xl px-4 py-3 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-medium">
                      {b.passengerName} <span className="text-gray-500 font-normal">· {b.seats} мест</span>
                    </div>
                    <span
                      className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full whitespace-nowrap ${
                        b.source === "edem30" ? "bg-violet-600/20 text-violet-300" : "bg-white/10 text-gray-400"
                      }`}
                    >
                      {b.source === "edem30" ? "🌐 Едем30" : "📞 Оператор"}
                    </span>
                  </div>
                  {b.passengerPhone && <div className="text-gray-500 text-xs mt-1">📞 {b.passengerPhone}</div>}
                  {!readOnly && (
                    <button
                      type="button"
                      onClick={() => cancelBooking(b.id)}
                      disabled={cancellingId === b.id}
                      className="text-red-400 hover:text-red-300 text-xs font-medium mt-1.5 disabled:opacity-50"
                    >
                      Отменить бронь
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
