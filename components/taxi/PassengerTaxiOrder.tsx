"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Car, Check, Loader2, X } from "lucide-react";

import AddressInput from "@/components/taxi/AddressInput";
import { formatPrice, formatSeats } from "@/lib/utils";

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
  driverVehicle: {
    bodyTypeLabel: string;
    model: string | null;
    plate: string | null;
    color: string | null;
  } | null;
};

type Props = {
  initialFrom?: string;
  initialTo?: string;
};

export default function PassengerTaxiOrder({ initialFrom, initialTo }: Props = {}) {
  const router = useRouter();

  const [order, setOrder] = useState<Order | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [redirecting, setRedirecting] = useState(false);

  const [from, setFrom] = useState(initialFrom ?? "");
  const [to, setTo] = useState(initialTo ?? "");
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

  useEffect(() => {
    if (order?.status !== "accepted" || !order.tripId || redirecting) return;

    setRedirecting(true);

    const timeout = setTimeout(() => {
      router.push(`/trip/${order.tripId}`);
    }, 1200);

    return () => clearTimeout(timeout);
  }, [order?.status, order?.tripId, redirecting, router]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (!from.trim() || !to.trim()) {
      setError("Укажите откуда и куда едем");
      return;
    }

    if (!price || Number(price) < 20) {
      setError("Минимальная цена поездки — 20 ₽");
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
      <div className="bg-[#12121c] border border-violet-500/20 rounded-3xl p-4 sm:p-6">
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

            {order.driverVehicle && (
              <div className="flex items-center gap-2.5 bg-violet-600/10 border border-violet-500/20 rounded-xl px-3.5 py-3 mt-4">
                <Car size={16} className="text-violet-400 shrink-0" />
                <div className="text-sm">
                  К вам едет{" "}
                  <span className="font-bold">
                    ({order.driverVehicle.color?.toLowerCase()}){" "}
                    {order.driverVehicle.model}
                  </span>{" "}
                  <span className="font-mono">{order.driverVehicle.plate}</span>
                </div>
              </div>
            )}

            <p className="text-sm text-violet-300 mt-5 flex items-center gap-2">
              <Loader2 size={14} className="animate-spin" />
              Открываем чат с водителем...
            </p>
          </>
        )}
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="bg-[#12121c] border border-white/5 rounded-3xl p-5 sm:p-6 space-y-3"
    >
      <div className="font-display flex items-center gap-2 font-bold text-lg mb-2">
        <Car size={18} className="text-violet-400" />
        Заказ такси
      </div>

      <AddressInput value={from} onChange={setFrom} placeholder="📍 Точка А" />
      <AddressInput value={to} onChange={setTo} placeholder="🏁 Точка Б" />

      <input
        type="number"
        min={20}
        max={100_000}
        value={price}
        onChange={(e) => setPrice(e.target.value)}
        placeholder="💰 Сколько готовы заплатить, ₽ (от 20 ₽)"
        className="w-full bg-[#171726] border border-white/10 focus:border-violet-500 rounded-2xl p-4 outline-none transition"
      />

      <select
        value={seats}
        onChange={(e) => setSeats(e.target.value)}
        className="w-full bg-[#171726] border border-white/10 focus:border-violet-500 rounded-2xl p-4 outline-none transition"
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
        className="btn-gradient w-full disabled:opacity-60 transition rounded-2xl py-4 font-bold"
      >
        {submitting ? "Оформляем..." : "Найти такси"}
      </button>
    </form>
  );
}
