"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Search, Pencil, Ban, Check, X, TriangleAlert } from "lucide-react";

import { formatDate, formatPrice } from "@/lib/utils";

type Status = "cancelled" | "completed" | "in_progress" | "scheduled";

type Trip = {
  id: number;
  from: string;
  to: string;
  date: string;
  time: string;
  price: number;
  status: Status;
  driverName: string;
};

const STATUS_LABELS: Record<Status, string> = {
  cancelled: "Отменена",
  completed: "Завершена",
  in_progress: "В пути",
  scheduled: "Запланирована",
};

const STATUS_STYLES: Record<Status, string> = {
  cancelled: "bg-red-500/10 text-red-400",
  completed: "bg-green-500/10 text-green-400",
  in_progress: "bg-violet-500/10 text-violet-300",
  scheduled: "bg-gray-500/10 text-gray-300",
};

function isStuckTrip(trip: Trip): boolean {
  if (trip.status !== "scheduled" && trip.status !== "in_progress") return false;

  const parsed = new Date(trip.date);

  if (Number.isNaN(parsed.getTime())) return false;

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  return parsed.getTime() < startOfToday.getTime();
}

export default function AdminTripsTable() {
  const [trips, setTrips] = useState<Trip[] | null>(null);
  const [search, setSearch] = useState("");
  const [stuckOnly, setStuckOnly] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editPrice, setEditPrice] = useState("");
  const [editDate, setEditDate] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);

  async function load(query: string) {
    const res = await fetch(
      `/api/admin/trips${query ? `?search=${encodeURIComponent(query)}` : ""}`,
      { cache: "no-store" }
    );
    const data = await res.json();
    setTrips(data.trips ?? []);
  }

  useEffect(() => {
    load(search);

    const interval = setInterval(() => {
      if (editingId === null) load(search);
    }, 5000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const stuckCount = useMemo(
    () => (trips ? trips.filter(isStuckTrip).length : 0),
    [trips]
  );

  const visibleTrips = useMemo(() => {
    if (!trips) return null;
    return stuckOnly ? trips.filter(isStuckTrip) : trips;
  }, [trips, stuckOnly]);

  function startEdit(trip: Trip) {
    setEditingId(trip.id);
    setEditPrice(String(trip.price));
    setEditDate(trip.date);
  }

  async function saveEdit(tripId: number) {
    setBusyId(tripId);

    await fetch(`/api/admin/trips/${tripId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ price: Number(editPrice), date: editDate }),
    });

    await load(search);
    setEditingId(null);
    setBusyId(null);
  }

  async function cancelTrip(tripId: number) {
    setBusyId(tripId);

    await fetch(`/api/admin/trips/${tripId}/cancel`, { method: "POST" });

    await load(search);
    setBusyId(null);
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            load(search);
          }}
          className="flex items-center gap-2 bg-[#12121c] border border-white/5 rounded-2xl px-4 py-2.5 max-w-sm flex-1 min-w-[220px]"
        >
          <Search size={16} className="text-gray-500 shrink-0" />

          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по городам"
            className="w-full bg-transparent outline-none text-sm placeholder:text-gray-500"
          />
        </form>

        <button
          onClick={() => setStuckOnly((v) => !v)}
          className={`flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-medium transition whitespace-nowrap ${
            stuckOnly
              ? "bg-yellow-500/20 text-yellow-300 border border-yellow-500/30"
              : "bg-[#12121c] border border-white/5 text-gray-400 hover:text-white"
          }`}
        >
          <TriangleAlert size={15} />
          Только зависшие{stuckCount > 0 ? ` (${stuckCount})` : ""}
        </button>
      </div>

      {!visibleTrips ? (
        <div className="py-16 flex items-center justify-center text-gray-500">
          <Loader2 size={20} className="animate-spin" />
        </div>
      ) : (
        <div className="bg-[#12121c] border border-white/5 rounded-2xl overflow-x-auto">
          <table className="w-full text-sm min-w-[860px]">
            <thead>
              <tr className="text-left text-gray-500 border-b border-white/5">
                <th className="px-4 py-3 font-medium">ID</th>
                <th className="px-4 py-3 font-medium">Откуда</th>
                <th className="px-4 py-3 font-medium">Куда</th>
                <th className="px-4 py-3 font-medium">Дата</th>
                <th className="px-4 py-3 font-medium">Цена</th>
                <th className="px-4 py-3 font-medium">Статус</th>
                <th className="px-4 py-3 font-medium">Водитель</th>
                <th className="px-4 py-3 font-medium">Действия</th>
              </tr>
            </thead>

            <tbody>
              {visibleTrips.map((t) => {
                const editing = editingId === t.id;
                const busy = busyId === t.id;
                const locked = t.status === "cancelled" || t.status === "completed";
                const stuck = isStuckTrip(t);

                return (
                  <tr
                    key={t.id}
                    className={`border-b border-white/5 last:border-0 ${
                      stuck ? "bg-yellow-500/5" : ""
                    }`}
                  >
                    <td className="px-4 py-3 text-gray-500">{t.id}</td>
                    <td className="px-4 py-3">{t.from}</td>
                    <td className="px-4 py-3">{t.to}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {editing ? (
                        <input
                          type="date"
                          value={editDate}
                          onChange={(e) => setEditDate(e.target.value)}
                          className="bg-[#1c1c2b] rounded-lg px-2 py-1 outline-none w-36"
                        />
                      ) : (
                        formatDate(t.date)
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {editing ? (
                        <input
                          type="number"
                          min={1}
                          value={editPrice}
                          onChange={(e) => setEditPrice(e.target.value)}
                          className="bg-[#1c1c2b] rounded-lg px-2 py-1 outline-none w-24"
                        />
                      ) : (
                        formatPrice(t.price)
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap ${STATUS_STYLES[t.status]}`}
                      >
                        {STATUS_LABELS[t.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 whitespace-nowrap">
                      {t.driverName}
                    </td>
                    <td className="px-4 py-3">
                      {editing ? (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => saveEdit(t.id)}
                            disabled={busy}
                            className="text-green-400 hover:text-green-300 disabled:opacity-60"
                            title="Сохранить"
                          >
                            <Check size={16} />
                          </button>

                          <button
                            onClick={() => setEditingId(null)}
                            disabled={busy}
                            className="text-gray-400 hover:text-white disabled:opacity-60"
                            title="Отмена"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => startEdit(t)}
                            disabled={locked || busy}
                            className="text-violet-400 hover:text-violet-300 disabled:opacity-40 disabled:cursor-not-allowed"
                            title="Изменить цену/дату"
                          >
                            <Pencil size={15} />
                          </button>

                          <button
                            onClick={() => cancelTrip(t.id)}
                            disabled={locked || busy}
                            className="text-red-400 hover:text-red-300 disabled:opacity-40 disabled:cursor-not-allowed"
                            title="Отменить поездку"
                          >
                            <Ban size={15} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}

              {visibleTrips.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-gray-500">
                    {stuckOnly ? "Зависших поездок нет" : "Ничего не найдено"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
