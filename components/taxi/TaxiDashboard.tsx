"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { Car, Check, Loader2, X } from "lucide-react";

import { useAuth } from "@/components/auth/AuthProvider";
import AddressInput from "@/components/taxi/AddressInput";
import DriverOrdersFeed from "@/components/taxi/DriverOrdersFeed";
import TripsList from "@/components/TripsList";
import { formatPrice, formatSeats } from "@/lib/utils";
import { Trip } from "@/types/trips";

type Order = {
  id: number;
  from: string;
  to: string;
  price: number;
  seats: number;
  status: "open" | "accepted" | "cancelled";
  passengerId: number;
  passengerName: string;
  tripId: number | null;
  createdAt: string;
};

type Props = {
  scheduledTrips: Trip[];
};

export default function TaxiDashboard({ scheduledTrips }: Props) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="py-16 flex items-center justify-center text-gray-500">
        <Loader2 size={20} className="animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="bg-[#12121c] border border-white/5 rounded-3xl p-8 text-center">
        <p className="text-gray-400 mb-5">
          Войдите, чтобы заказать такси или начать таксовать.
        </p>

        <Link
          href="/login?redirect=/taxi"
          className="inline-block bg-violet-600 hover:bg-violet-700 transition rounded-xl px-6 py-3 font-bold"
        >
          Войти
        </Link>
      </div>
    );
  }

  return user.role === "driver" ? (
    <DriverOrdersFeed />
  ) : (
    <PassengerView scheduledTrips={scheduledTrips} />
  );
}

function PassengerView({ scheduledTrips }: { scheduledTrips: Trip[] }) {
  const [order, setOrder] = useState<Order | null>(null);
  const [dismissed, setDismissed] = useState(false);

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [price, setPrice] = useState("");
  const [seats, setSeats] = useState("1");

  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  async function loadMine() {
    const res = await fetch("/api/taxi-orders/mine", { cache: "no-store" });
    const data = await res.json();
    setOrder(data.order);
  }

  useEffect(() => {
    loadMine();

    const interval = setInterval(loadMine, 4000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (order?.status === "open") setDismissed(false);
  }, [order?.id, order?.status]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (!from.trim() || !to.trim()) {
      setError("Укажите откуда и куда едем");
      return;
    }

    if (!price || Number(price) <= 0) {
      setError("Укажите сумму за поездку");
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch("/api/taxi-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from: from.trim(),
          to: to.trim(),
          price: Number(price),
          seats: Number(seats),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Не удалось оформить заказ");
        setSubmitting(false);
        return;
      }

      setFrom("");
      setTo("");
      setPrice("");
      setSeats("1");
      await loadMine();
    } catch {
      setError("Не удалось подключиться к серверу");
    } finally {
      setSubmitting(false);
    }
  }

  async function cancel() {
    if (!order) return;

    setCancelling(true);
    await fetch(`/api/taxi-orders/${order.id}/cancel`, { method: "POST" });
    await loadMine();
    setCancelling(false);
  }

  const showActiveOrder = order && order.status !== "cancelled" && !dismissed;

  if (showActiveOrder && order) {
    return (
      <div className="max-w-md space-y-8">
        <div className="bg-[#12121c] border border-violet-500/20 rounded-3xl p-6">
          {order.status === "open" ? (
            <>
              <div className="flex items-center gap-2.5 text-violet-400 font-bold mb-4">
                <Loader2 size={18} className="animate-spin" />
                Ищем водителя...
              </div>

              <div className="text-sm text-gray-400 space-y-1.5">
                <div>
                  {order.from} → {order.to}
                </div>
                <div>
                  {formatPrice(order.price)} · {formatSeats(order.seats)}
                </div>
              </div>

              <button
                onClick={cancel}
                disabled={cancelling}
                className="w-full mt-5 flex items-center justify-center gap-2 border border-white/10 hover:bg-white/5 disabled:opacity-60 transition rounded-xl py-3 text-sm font-medium"
              >
                <X size={15} />
                {cancelling ? "Отменяем..." : "Отменить заказ"}
              </button>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2.5 text-green-400 font-bold mb-4">
                <Check size={18} />
                Водитель найден
              </div>

              <div className="text-sm text-gray-400 space-y-1.5">
                <div>
                  {order.from} → {order.to}
                </div>
                <div>
                  {formatPrice(order.price)} · {formatSeats(order.seats)}
                </div>
              </div>

              <div className="flex gap-3 mt-5">
                {order.tripId && (
                  <Link
                    href={`/trip/${order.tripId}`}
                    className="flex-1 text-center bg-violet-600 hover:bg-violet-700 transition rounded-xl py-3 text-sm font-bold"
                  >
                    Открыть поездку
                  </Link>
                )}

                <button
                  onClick={() => setDismissed(true)}
                  className="border border-white/10 hover:bg-white/5 transition rounded-xl px-4 py-3 text-sm font-medium"
                >
                  Заказать ещё
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md space-y-10">
      <form
        onSubmit={submit}
        className="bg-[#12121c] border border-white/5 rounded-3xl p-5 sm:p-6 space-y-3"
      >
        <div className="flex items-center gap-2 font-bold text-lg mb-2">
          <Car size={18} className="text-violet-400" />
          Заказать такси
        </div>

        <AddressInput value={from} onChange={setFrom} placeholder="📍 Точка А" />
        <AddressInput value={to} onChange={setTo} placeholder="🏁 Точка Б" />

        <input
          type="number"
          min={1}
          max={100_000}
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="💰 Сколько готовы заплатить, ₽"
          className="w-full bg-[#171726] rounded-2xl p-4 outline-none"
        />

        <select
          value={seats}
          onChange={(e) => setSeats(e.target.value)}
          className="w-full bg-[#171726] rounded-2xl p-4 outline-none"
        >
          {[1, 2, 3, 4].map((n) => (
            <option key={n} value={n}>
              {formatSeats(n)}
            </option>
          ))}
        </select>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-violet-600 hover:bg-violet-700 disabled:opacity-60 transition rounded-2xl py-4 font-bold"
        >
          {submitting ? "Оформляем..." : "Найти такси"}
        </button>
      </form>

      <TripsList
        trips={scheduledTrips}
        emptyText="Пока нет поездок по расписанию"
      />
    </div>
  );
}
