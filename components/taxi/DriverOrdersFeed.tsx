"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Users } from "lucide-react";

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
};

export default function DriverOrdersFeed() {
  const router = useRouter();

  const [orders, setOrders] = useState<Order[]>([]);
  const [balance, setBalance] = useState(0);
  const [acceptingId, setAcceptingId] = useState<number | null>(null);
  const [error, setError] = useState("");

  async function load() {
    const res = await fetch("/api/taxi-orders", { cache: "no-store" });
    const data = await res.json();
    setOrders(data.orders ?? []);
    setBalance(data.balance ?? 0);
  }

  useEffect(() => {
    load();

    const interval = setInterval(load, 3000);

    return () => clearInterval(interval);
  }, []);

  async function accept(orderId: number) {
    setError("");
    setAcceptingId(orderId);

    try {
      const res = await fetch(`/api/taxi-orders/${orderId}/accept`, {
        method: "POST",
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Не удалось принять заказ");
        await load();
        setAcceptingId(null);
        return;
      }

      router.push(`/trip/${data.tripId}`);
    } catch {
      setError("Не удалось подключиться к серверу");
      setAcceptingId(null);
    }
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between gap-4 mb-5">
        <div className="flex items-center gap-2 font-bold text-lg">
          <Users size={18} className="text-violet-400" />
          Заказы пассажиров
        </div>

        <div className="bg-[#12121c] border border-violet-500/20 rounded-xl px-4 py-2 text-right">
          <div className="text-[11px] text-gray-500 leading-none">Баланс</div>
          <div className="font-bold text-violet-300 leading-none mt-1">
            {formatPrice(balance)}
          </div>
        </div>
      </div>

      {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

      {orders.length === 0 ? (
        <div className="bg-[#12121c] border border-white/5 rounded-3xl p-10 text-center text-gray-500 text-sm">
          Пока нет заказов. Как только пассажир оформит заявку, она появится
          здесь.
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div
              key={order.id}
              className="bg-[#12121c] border border-white/5 rounded-3xl p-5 flex items-center justify-between gap-4"
            >
              <div>
                <div className="font-bold">
                  {order.from} → {order.to}
                </div>

                <div className="text-sm text-gray-500 mt-1">
                  {order.passengerName} · {formatSeats(order.seats)}
                </div>
              </div>

              <div className="flex items-center gap-4 shrink-0">
                <div className="text-violet-400 font-bold text-lg">
                  {formatPrice(order.price)}
                </div>

                <button
                  onClick={() => accept(order.id)}
                  disabled={acceptingId === order.id}
                  className="bg-violet-600 hover:bg-violet-700 disabled:opacity-60 transition rounded-xl px-5 py-2.5 text-sm font-bold whitespace-nowrap"
                >
                  {acceptingId === order.id ? "Принимаем..." : "Принять"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
