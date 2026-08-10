"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Banknote,
  CheckCircle2,
  Clock,
  Gift,
  Loader2,
  Search,
  Users,
  X,
} from "lucide-react";

import { formatDate, formatPrice } from "@/lib/utils";

type BonusStatus = "pending" | "approved" | "paid" | "rejected";

const STATUS_LABELS: Record<BonusStatus, string> = {
  pending: "Ожидает",
  approved: "Одобрено",
  paid: "Выплачено",
  rejected: "Отклонено",
};

const STATUS_STYLES: Record<BonusStatus | "mixed", string> = {
  pending: "bg-yellow-500/10 text-yellow-400",
  approved: "bg-violet-500/10 text-violet-300",
  paid: "bg-green-500/10 text-green-400",
  rejected: "bg-red-500/10 text-red-400",
  mixed: "bg-gray-500/10 text-gray-300",
};

type BonusTripSummary = {
  tripId: number;
  tripDate: string;
  tripTime: string;
  fromCity: string;
  toCity: string;
  price: number;
  totalSeats: number;
  driverId: number;
  driverName: string;
  driverPhone: string | null;
  passengersTotal: number;
  passengersCompleted: number;
  bonusCount: number;
  bonusTotal: number;
  status: BonusStatus | "mixed";
};

type Stats = {
  successfulTrips: number;
  passengers: number;
  accruedCount: number;
  paidCount: number;
  pendingCount: number;
  totalPayoutSum: number;
};

export default function AdminDriverBonusesPanel() {
  const [trips, setTrips] = useState<BonusTripSummary[] | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [driverSearch, setDriverSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [status, setStatus] = useState<BonusStatus | "">("");

  const [openTripId, setOpenTripId] = useState<number | null>(null);

  function load() {
    const params = new URLSearchParams();
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    if (driverSearch) params.set("driver", driverSearch);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    if (status) params.set("status", status);

    fetch(`/api/admin/driver-bonuses?${params.toString()}`, { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        setTrips(data.trips ?? []);
        setStats(data.stats ?? null);
      });
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const statCards = useMemo(
    () =>
      stats
        ? [
            { label: "Успешных поездок", value: stats.successfulTrips, icon: CheckCircle2 },
            { label: "Пассажиров", value: stats.passengers, icon: Users },
            { label: "Начислено бонусов", value: stats.accruedCount, icon: Gift },
            { label: "Выплачено", value: stats.paidCount, icon: Banknote },
            { label: "Ожидает выплаты", value: stats.pendingCount, icon: Clock },
            { label: "Сумма выплат", value: formatPrice(stats.totalPayoutSum), icon: Banknote },
          ]
        : [],
    [stats]
  );

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {statCards.map((c) => (
          <div key={c.label} className="bg-[#12121c] border border-white/5 rounded-2xl p-4">
            <div className="flex items-center gap-1.5 text-gray-500 text-xs mb-2">
              <c.icon size={13} />
              {c.label}
            </div>
            <div className="text-xl font-bold">{c.value}</div>
          </div>
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          load();
        }}
        className="flex flex-wrap items-center gap-2 mb-5"
      >
        <input
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          type="date"
          className="bg-[#12121c] border border-white/5 rounded-xl px-3 py-2.5 text-sm outline-none"
        />
        <input
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          type="date"
          className="bg-[#12121c] border border-white/5 rounded-xl px-3 py-2.5 text-sm outline-none"
        />
        <input
          value={driverSearch}
          onChange={(e) => setDriverSearch(e.target.value)}
          placeholder="Водитель (имя/телефон)"
          className="bg-[#12121c] border border-white/5 rounded-xl px-3 py-2.5 text-sm outline-none min-w-[180px]"
        />
        <input
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          placeholder="Откуда"
          className="bg-[#12121c] border border-white/5 rounded-xl px-3 py-2.5 text-sm outline-none min-w-[120px]"
        />
        <input
          value={to}
          onChange={(e) => setTo(e.target.value)}
          placeholder="Куда"
          className="bg-[#12121c] border border-white/5 rounded-xl px-3 py-2.5 text-sm outline-none min-w-[120px]"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as BonusStatus | "")}
          className="bg-[#12121c] border border-white/5 rounded-xl px-3 py-2.5 text-sm outline-none"
        >
          <option value="">Любой статус</option>
          {(Object.keys(STATUS_LABELS) as BonusStatus[]).map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="btn-gradient rounded-xl px-4 py-2.5 text-sm font-bold flex items-center gap-1.5"
        >
          <Search size={14} />
          Найти
        </button>
      </form>

      {!trips ? (
        <div className="py-16 flex items-center justify-center text-gray-500">
          <Loader2 size={20} className="animate-spin" />
        </div>
      ) : (
        <div className="bg-[#12121c] border border-white/5 rounded-2xl overflow-x-auto">
          <table className="w-full text-sm min-w-[980px]">
            <thead>
              <tr className="text-left text-gray-500 border-b border-white/5">
                <th className="px-4 py-3 font-medium">ID</th>
                <th className="px-4 py-3 font-medium">Дата/время</th>
                <th className="px-4 py-3 font-medium">Водитель</th>
                <th className="px-4 py-3 font-medium">Маршрут</th>
                <th className="px-4 py-3 font-medium">Цена</th>
                <th className="px-4 py-3 font-medium">Мест</th>
                <th className="px-4 py-3 font-medium">Пассажиров</th>
                <th className="px-4 py-3 font-medium">Бонус</th>
                <th className="px-4 py-3 font-medium">Статус</th>
                <th className="px-4 py-3 font-medium">Действия</th>
              </tr>
            </thead>

            <tbody>
              {trips.map((t) => (
                <tr key={t.tripId} className="border-b border-white/5 last:border-0">
                  <td className="px-4 py-3 text-gray-500">{t.tripId}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {formatDate(t.tripDate)} {t.tripTime}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="font-medium">{t.driverName}</div>
                    <div className="text-gray-500 text-xs">
                      #{t.driverId} {t.driverPhone ? `· +${t.driverPhone}` : ""}
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {t.fromCity} → {t.toCity}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">{formatPrice(t.price)}</td>
                  <td className="px-4 py-3">{t.totalSeats}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {t.passengersCompleted} / {t.passengersTotal}
                  </td>
                  <td className="px-4 py-3 font-bold whitespace-nowrap">{formatPrice(t.bonusTotal)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap ${STATUS_STYLES[t.status]}`}
                    >
                      {t.status === "mixed" ? "Разное" : STATUS_LABELS[t.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => setOpenTripId(t.tripId)}
                      className="text-violet-400 hover:text-violet-300 text-xs font-medium whitespace-nowrap"
                    >
                      Открыть →
                    </button>
                  </td>
                </tr>
              ))}

              {trips.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-10 text-center text-gray-500">
                    Поездок с бонусами пока нет
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {openTripId !== null && (
        <BonusTripModal tripId={openTripId} onClose={() => setOpenTripId(null)} onChanged={load} />
      )}
    </div>
  );
}

type BonusPassengerDetail = {
  userId: number;
  name: string;
  phone: string | null;
  joinedAt: string;
  startConfirmed: boolean;
  completeConfirmed: boolean;
  bonusId: number | null;
  amount: number | null;
  status: BonusStatus | null;
  approvedAt: string | null;
  paidAt: string | null;
  rejectedAt: string | null;
};

type BonusTripDetail = {
  tripId: number;
  tripDate: string;
  tripTime: string;
  fromCity: string;
  toCity: string;
  price: number;
  totalSeats: number;
  driverId: number;
  driverName: string;
  driverPhone: string | null;
  completed: boolean;
  cancelled: boolean;
  passengers: BonusPassengerDetail[];
};

function BonusTripModal({
  tripId,
  onClose,
  onChanged,
}: {
  tripId: number;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [detail, setDetail] = useState<BonusTripDetail | null>(null);
  const [busy, setBusy] = useState(false);

  function load() {
    fetch(`/api/admin/driver-bonuses/${tripId}`, { cache: "no-store" })
      .then((res) => res.json())
      .then(setDetail);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripId]);

  async function bulkAction(action: "approved" | "paid" | "rejected") {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/driver-bonuses/${tripId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: action }),
      });
      if (res.ok) {
        load();
        onChanged();
      } else {
        const err = await res.json().catch(() => null);
        alert(err?.error ?? "Не удалось изменить статус");
      }
    } finally {
      setBusy(false);
    }
  }

  async function singleAction(bonusId: number, action: "approved" | "paid" | "rejected") {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/driver-bonuses/bonus/${bonusId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: action }),
      });
      if (res.ok) {
        load();
        onChanged();
      } else {
        const err = await res.json().catch(() => null);
        alert(err?.error ?? "Не удалось изменить статус");
      }
    } finally {
      setBusy(false);
    }
  }

  const bonusTotal = detail?.passengers.reduce((sum, p) => sum + (p.amount ?? 0), 0) ?? 0;
  const bonusCount = detail?.passengers.filter((p) => p.bonusId !== null).length ?? 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4" onClick={onClose}>
      <div
        className="bg-[#171726] border border-white/10 rounded-3xl p-6 w-full max-w-2xl max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {!detail ? (
          <div className="py-16 flex items-center justify-center text-gray-500">
            <Loader2 size={20} className="animate-spin" />
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <div className="font-display font-bold text-lg">
                  {detail.fromCity} → {detail.toCity}
                </div>
                <div className="text-sm text-gray-500 mt-0.5">
                  ID {detail.tripId} · {formatDate(detail.tripDate)} {detail.tripTime} · {formatPrice(detail.price)} ·{" "}
                  {detail.totalSeats} мест
                </div>
                <div className="text-sm text-gray-400 mt-1">
                  Водитель: <span className="text-white font-medium">{detail.driverName}</span> (#{detail.driverId}
                  {detail.driverPhone ? `, +${detail.driverPhone}` : ""})
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {detail.cancelled ? (
                    <span className="text-red-400">Поездка отменена</span>
                  ) : detail.completed ? (
                    <span className="text-green-400">Поездка завершена</span>
                  ) : (
                    <span className="text-yellow-400">Поездка ещё не завершена</span>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:bg-white/5 transition shrink-0"
                aria-label="Закрыть"
              >
                <X size={16} />
              </button>
            </div>

            <div className="bg-[#12121c] border border-white/5 rounded-2xl p-4 mb-4 flex items-center justify-between flex-wrap gap-3">
              <div className="text-sm">
                Пассажиров с бонусом: <b>{bonusCount}</b> · Итого бонус водителю:{" "}
                <b className="text-green-400">{formatPrice(bonusTotal)}</b>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => bulkAction("approved")}
                  disabled={busy || bonusCount === 0}
                  className="text-xs font-medium px-3 py-1.5 rounded-full bg-violet-500/15 text-violet-300 hover:bg-violet-500/25 disabled:opacity-40 transition"
                >
                  Одобрить всё
                </button>
                <button
                  type="button"
                  onClick={() => bulkAction("paid")}
                  disabled={busy || bonusCount === 0}
                  className="text-xs font-medium px-3 py-1.5 rounded-full bg-green-500/15 text-green-400 hover:bg-green-500/25 disabled:opacity-40 transition"
                >
                  Отметить выплаченным
                </button>
                <button
                  type="button"
                  onClick={() => bulkAction("rejected")}
                  disabled={busy || bonusCount === 0}
                  className="text-xs font-medium px-3 py-1.5 rounded-full bg-red-500/15 text-red-400 hover:bg-red-500/25 disabled:opacity-40 transition"
                >
                  Отклонить всё
                </button>
              </div>
            </div>

            <div className="text-sm font-bold mb-2">Пассажиры ({detail.passengers.length})</div>

            <div className="space-y-2">
              {detail.passengers.map((p) => (
                <div key={p.userId} className="bg-[#12121c] border border-white/5 rounded-2xl px-4 py-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div>
                      <div className="font-medium text-sm">
                        {p.name} <span className="text-gray-500 font-normal">#{p.userId}</span>
                      </div>
                      <div className="text-gray-500 text-xs mt-0.5">
                        {p.phone ? `+${p.phone} · ` : ""}
                        бронь {formatDate(p.joinedAt)}
                      </div>
                      <div className="text-xs mt-1 flex items-center gap-2">
                        <span className={p.startConfirmed ? "text-green-400" : "text-gray-500"}>
                          {p.startConfirmed ? "✓ начало подтвердил" : "начало не подтвердил"}
                        </span>
                        <span className={p.completeConfirmed ? "text-green-400" : "text-gray-500"}>
                          {p.completeConfirmed ? "✓ завершение подтвердил" : "завершение не подтвердил"}
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      {p.bonusId === null ? (
                        <span className="text-xs text-gray-500">Без бонуса</span>
                      ) : (
                        <>
                          <div className="font-bold text-sm">{formatPrice(p.amount ?? 0)}</div>
                          <span
                            className={`text-[10px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${STATUS_STYLES[p.status as BonusStatus]}`}
                          >
                            {STATUS_LABELS[p.status as BonusStatus]}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {p.bonusId !== null && p.status !== "paid" && (
                    <div className="flex items-center gap-3 mt-2">
                      {p.status !== "approved" && (
                        <button
                          type="button"
                          onClick={() => singleAction(p.bonusId as number, "approved")}
                          disabled={busy}
                          className="text-violet-400 hover:text-violet-300 text-xs font-medium disabled:opacity-50"
                        >
                          Одобрить
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => singleAction(p.bonusId as number, "paid")}
                        disabled={busy}
                        className="text-green-400 hover:text-green-300 text-xs font-medium disabled:opacity-50"
                      >
                        Выплачено
                      </button>
                      {p.status !== "rejected" && (
                        <button
                          type="button"
                          onClick={() => singleAction(p.bonusId as number, "rejected")}
                          disabled={busy}
                          className="text-red-400 hover:text-red-300 text-xs font-medium disabled:opacity-50"
                        >
                          Отклонить
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
