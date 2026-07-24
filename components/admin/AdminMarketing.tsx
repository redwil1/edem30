"use client";

import { useEffect, useState } from "react";
import {
  BarChart3,
  Car,
  List,
  Loader2,
  MapPin,
  Percent,
  TrendingUp,
  UserPlus,
  Users,
} from "lucide-react";

import { TRAFFIC_SOURCE_COLORS, TRAFFIC_SOURCE_LABELS, TrafficSource } from "@/lib/traffic";

type SourceRow = {
  source: TrafficSource;
  visits: number;
  registrations: number;
  trips: number;
  taxiOrders: number;
  conversion: number;
};

type MarketingPeriod = "today" | "week" | "month" | "all";

type MarketingStats = {
  periods: Record<
    MarketingPeriod,
    {
      sources: SourceRow[];
      totalVisits: number;
      totalRegistrations: number;
      totalTrips: number;
      totalTaxiOrders: number;
    }
  >;
  visitors: {
    today: { new: number; returning: number };
    week: { new: number; returning: number };
    month: { new: number; returning: number };
    allTimeTotal: number;
  };
};

const PERIOD_TABS: [key: MarketingPeriod, label: string][] = [
  ["today", "Сегодня"],
  ["week", "Неделя"],
  ["month", "Месяц"],
  ["all", "Всё время"],
];

const CHART_HEIGHT = 160;

function BarChart({
  rows,
  field,
  formatValue,
}: {
  rows: SourceRow[];
  field: "visits" | "conversion";
  formatValue: (v: number) => string;
}) {
  const [hovered, setHovered] = useState<TrafficSource | null>(null);

  const sorted = [...rows].sort((a, b) => b[field] - a[field]);
  const max = Math.max(...sorted.map((r) => r[field]), 1);

  return (
    <div
      className="flex items-end gap-3"
      style={{ height: CHART_HEIGHT }}
      role="img"
      aria-label={`${field === "visits" ? "Переходы" : "Конверсия"} по источникам`}
    >
      {sorted.map((row) => {
        const value = row[field];
        const barHeight = Math.max((value / max) * (CHART_HEIGHT - 40), value > 0 ? 4 : 2);
        const color = TRAFFIC_SOURCE_COLORS[row.source];

        return (
          <div
            key={row.source}
            className="flex-1 flex flex-col items-center justify-end h-full relative"
            onMouseEnter={() => setHovered(row.source)}
            onMouseLeave={() => setHovered(null)}
          >
            {hovered === row.source && (
              <div className="absolute -top-1 -translate-y-full bg-[#222233] border border-white/10 rounded-lg px-3 py-2 text-xs whitespace-nowrap z-10 shadow-lg space-y-0.5">
                <div className="font-bold">{TRAFFIC_SOURCE_LABELS[row.source]}</div>
                <div className="text-gray-400">{row.visits} переходов</div>
                <div className="text-gray-400">{row.registrations} регистраций</div>
                <div className="text-gray-400">{row.trips} поездок · {row.taxiOrders} такси</div>
                <div className="text-gray-400">{row.conversion}% конверсия</div>
              </div>
            )}

            <div className="text-[11px] font-medium text-gray-300 mb-1">
              {formatValue(value)}
            </div>

            <div
              className="w-full rounded-t-[4px] transition-opacity"
              style={{
                height: barHeight,
                backgroundColor: color,
                opacity: hovered === null || hovered === row.source ? 1 : 0.45,
              }}
            />

            <div className="text-[10px] text-gray-500 mt-1.5 whitespace-nowrap text-center">
              {TRAFFIC_SOURCE_LABELS[row.source]}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function AdminMarketing() {
  const [stats, setStats] = useState<MarketingStats | null>(null);
  const [period, setPeriod] = useState<MarketingPeriod>("week");
  const [view, setView] = useState<"chart" | "table">("chart");

  useEffect(() => {
    fetch("/api/admin/marketing", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => setStats(data));
  }, []);

  if (!stats) {
    return (
      <div className="py-16 flex items-center justify-center text-gray-500">
        <Loader2 size={20} className="animate-spin" />
      </div>
    );
  }

  const current = stats.periods[period];
  const sortedByVisits = [...current.sources].sort((a, b) => b.visits - a.visits);
  const overallConversion =
    current.totalVisits > 0
      ? Math.round((current.totalRegistrations / current.totalVisits) * 1000) / 10
      : 0;

  const visitors = period !== "all" ? stats.visitors[period] : null;

  const summaryCards = [
    { label: "Переходы", value: current.totalVisits, icon: Users },
    { label: "Регистрации", value: current.totalRegistrations, icon: UserPlus },
    { label: "Поездки созданы", value: current.totalTrips, icon: Car },
    { label: "Заказы такси", value: current.totalTaxiOrders, icon: MapPin },
    { label: "Конверсия", value: `${overallConversion}%`, icon: Percent },
  ];

  return (
    <div className="space-y-6">
      <div className="flex bg-[#171726] rounded-2xl p-1 w-fit">
        {PERIOD_TABS.map(([key, label]) => (
          <button
            key={key}
            onClick={() => setPeriod(key)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition whitespace-nowrap ${
              period === key ? "bg-violet-600 text-white" : "text-gray-400 hover:text-white"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {summaryCards.map((c) => (
          <div key={c.label} className="bg-[#12121c] border border-white/5 rounded-2xl p-4">
            <div className="flex items-center gap-1.5 text-gray-500 text-xs mb-2">
              <c.icon size={13} />
              {c.label}
            </div>
            <div className="text-xl font-bold">{c.value}</div>
          </div>
        ))}
      </div>

      <div className="bg-[#12121c] border border-white/5 rounded-2xl p-5">
        <div className="flex items-center gap-2 text-gray-500 text-sm mb-4">
          <TrendingUp size={16} />
          {visitors ? "Новые и постоянные пользователи" : "Уникальные посетители с аккаунтом"}
        </div>

        {visitors ? (
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-[#171726] rounded-xl p-4">
              <div className="text-xs text-gray-500 mb-2">Новые</div>
              <div className="text-2xl font-bold">{visitors.new}</div>
            </div>
            <div className="bg-[#171726] rounded-xl p-4">
              <div className="text-xs text-gray-500 mb-2">Постоянные</div>
              <div className="text-2xl font-bold">{visitors.returning}</div>
            </div>
          </div>
        ) : (
          <div className="bg-[#171726] rounded-xl p-4 w-fit">
            <div className="text-2xl font-bold">{stats.visitors.allTimeTotal}</div>
          </div>
        )}
      </div>

      <div className="bg-[#12121c] border border-white/5 rounded-2xl p-5">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2 text-gray-500 text-sm">
            <BarChart3 size={16} />
            Переходы по источникам
          </div>

          <button
            type="button"
            onClick={() => setView(view === "chart" ? "table" : "chart")}
            className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-white transition"
          >
            <List size={13} />
            {view === "chart" ? "Таблица" : "График"}
          </button>
        </div>

        {view === "chart" ? (
          <BarChart rows={current.sources} field="visits" formatValue={(v) => String(v)} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 text-xs">
                  <th className="pb-2 pr-4">Источник</th>
                  <th className="pb-2 pr-4">Переходы</th>
                  <th className="pb-2 pr-4">Регистрации</th>
                  <th className="pb-2 pr-4">Поездки</th>
                  <th className="pb-2 pr-4">Такси</th>
                  <th className="pb-2">Конверсия</th>
                </tr>
              </thead>
              <tbody>
                {sortedByVisits.map((row) => (
                  <tr key={row.source} className="border-t border-white/5">
                    <td className="py-2 pr-4 flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: TRAFFIC_SOURCE_COLORS[row.source] }}
                      />
                      {TRAFFIC_SOURCE_LABELS[row.source]}
                    </td>
                    <td className="py-2 pr-4">{row.visits}</td>
                    <td className="py-2 pr-4">{row.registrations}</td>
                    <td className="py-2 pr-4">{row.trips}</td>
                    <td className="py-2 pr-4">{row.taxiOrders}</td>
                    <td className="py-2">{row.conversion}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-[#12121c] border border-white/5 rounded-2xl p-5">
        <div className="flex items-center gap-2 text-gray-500 text-sm mb-4">
          <Percent size={16} />
          Конверсия в регистрацию по источникам
        </div>

        <BarChart rows={current.sources} field="conversion" formatValue={(v) => `${v}%`} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {sortedByVisits.map((row) => (
          <div key={row.source} className="bg-[#12121c] border border-white/5 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <span
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: TRAFFIC_SOURCE_COLORS[row.source] }}
              />
              <div className="font-bold">{TRAFFIC_SOURCE_LABELS[row.source]}</div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-gray-500 text-xs mb-0.5">Переходы</div>
                <div className="font-bold text-lg">{row.visits}</div>
              </div>
              <div>
                <div className="text-gray-500 text-xs mb-0.5">Регистрации</div>
                <div className="font-bold text-lg">{row.registrations}</div>
              </div>
              <div>
                <div className="text-gray-500 text-xs mb-0.5">Поездки</div>
                <div className="font-bold text-lg">{row.trips}</div>
              </div>
              <div>
                <div className="text-gray-500 text-xs mb-0.5">Такси</div>
                <div className="font-bold text-lg">{row.taxiOrders}</div>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between text-xs text-gray-500">
              Конверсия
              <span className="text-gray-300 font-medium">{row.conversion}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
