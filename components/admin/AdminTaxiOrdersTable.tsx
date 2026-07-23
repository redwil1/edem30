"use client";

import { useEffect, useState } from "react";
import { Loader2, X } from "lucide-react";

import { formatPrice } from "@/lib/utils";

type Status = "open" | "accepted" | "cancelled";

type Order = {
  id: number;
  from: string;
  to: string;
  price: number;
  seats: number;
  status: Status;
  passengerName: string;
  driverName: string | null;
  tripId: number | null;
  createdAt: string;
};

const STATUS_LABELS: Record<Status, string> = {
  open: "Открыт",
  accepted: "Принят",
  cancelled: "Отменён",
};

const STATUS_CLASSNAMES: Record<Status, string> = {
  open: "bg-yellow-500/15 text-yellow-300",
  accepted: "bg-green-500/15 text-green-400",
  cancelled: "bg-gray-500/15 text-gray-400",
};

const FILTERS: { value: Status | "all"; label: string }[] = [
  { value: "all", label: "Все" },
  { value: "open", label: "Открытые" },
  { value: "accepted", label: "Принятые" },
  { value: "cancelled", label: "Отменённые" },
];

export default function AdminTaxiOrdersTable() {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [filter, setFilter] = useState<Status | "all">("all");
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const [error, setError] = useState("");

  async function load(activeFilter: Status | "all") {
    const params = new URLSearchParams();
    if (activeFilter !== "all") params.set("status", activeFilter);

    const res = await fetch(`/api/admin/taxi-orders?${params.toString()}`, {
      cache: "no-store",
    });
    const data = await res.json();
    setOrders(data.orders ?? []);
  }

  useEffect(() => {
    load(filter);

    const interval = setInterval(() => load(filter), 8000);

    return () => clearInterval(interval);
  }, [filter]);

  async function cancelOrder(order: Order) {
    if (!confirm(`Отменить заказ такси #${order.id} (${order.from} → ${order.to})?`)) return;

    setError("");
    setCancellingId(order.id);

    try {
      const res = await fetch(`/api/admin/taxi-orders/${order.id}/cancel`, {
        method: "POST",
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setError(data?.error || "Не удалось отменить заказ");
        return;
      }

      await load(filter);
    } finally {
      setCancellingId(null);
    }
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-5 overflow-x-auto pb-1">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setFilter(f.value)}
            className={`whitespace-nowrap rounded-xl px-3.5 py-2 text-xs font-medium transition ${
              filter === f.value
                ? "bg-violet-600 text-white"
                : "bg-[#12121c] border border-white/5 text-gray-400 hover:text-white"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {!orders ? (
        <div className="py-16 flex items-center justify-center text-gray-500">
          <Loader2 size={20} className="animate-spin" />
        </div>
      ) : (
        <div className="bg-[#12121c] border border-white/5 rounded-2xl overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead>
              <tr className="text-left text-gray-500 border-b border-white/5">
                <th className="px-4 py-3 font-medium">ID</th>
                <th className="px-4 py-3 font-medium">Маршрут</th>
                <th className="px-4 py-3 font-medium">Цена</th>
                <th className="px-4 py-3 font-medium">Пассажир</th>
                <th className="px-4 py-3 font-medium">Водитель</th>
                <th className="px-4 py-3 font-medium">Статус</th>
                <th className="px-4 py-3 font-medium">Создан</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>

            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-b border-white/5 last:border-0">
                  <td className="px-4 py-3 text-gray-500">{o.id}</td>
                  <td className="px-4 py-3 font-medium max-w-[220px] truncate">
                    {o.from} → {o.to}
                  </td>
                  <td className="px-4 py-3">{formatPrice(o.price)}</td>
                  <td className="px-4 py-3 text-gray-400">{o.passengerName}</td>
                  <td className="px-4 py-3 text-gray-400">{o.driverName ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center text-[11px] font-medium px-2 py-1 rounded-full whitespace-nowrap ${STATUS_CLASSNAMES[o.status]}`}
                    >
                      {STATUS_LABELS[o.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{o.createdAt}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    {o.status === "open" && (
                      <button
                        type="button"
                        onClick={() => cancelOrder(o)}
                        disabled={cancellingId === o.id}
                        title="Отменить заказ"
                        className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-red-400 hover:bg-red-500/10 disabled:opacity-30 transition"
                      >
                        {cancellingId === o.id ? (
                          <Loader2 size={15} className="animate-spin" />
                        ) : (
                          <X size={15} />
                        )}
                      </button>
                    )}
                  </td>
                </tr>
              ))}

              {orders.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-gray-500">
                    Заказов не найдено
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {error && <p className="text-red-400 text-sm mt-3">{error}</p>}
    </div>
  );
}
