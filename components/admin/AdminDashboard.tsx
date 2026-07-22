"use client";

import { useEffect, useState } from "react";
import { Car, Eye, Flag, Loader2, Shield, Star, Users } from "lucide-react";

import { formatTimeAgo } from "@/lib/utils";

type TypeCounts = {
  intercity: number;
  city: number;
};

type VisitPeriod = {
  registered: number;
  guest: number;
};

type AdminAccount = {
  id: number;
  name: string;
  lastLoginIp: string | null;
  lastLoginAt: string | null;
};

type Stats = {
  usersCount: number;
  tripsCount: number;
  tripsByType: TypeCounts;
  reviewsCount: number;
  reviewsByType: TypeCounts;
  newReportsCount: number;
  visits: {
    day: VisitPeriod;
    week: VisitPeriod;
    month: VisitPeriod;
  };
  admins: AdminAccount[];
};

const VISIT_PERIOD_LABELS: [key: "day" | "week" | "month", label: string][] = [
  ["day", "За сутки"],
  ["week", "За неделю"],
  ["month", "За месяц"],
];

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    function load() {
      fetch("/api/admin/stats", { cache: "no-store" })
        .then((res) => res.json())
        .then((data) => setStats(data));
    }

    load();

    const interval = setInterval(load, 10000);

    return () => clearInterval(interval);
  }, []);

  if (!stats) {
    return (
      <div className="py-16 flex items-center justify-center text-gray-500">
        <Loader2 size={20} className="animate-spin" />
      </div>
    );
  }

  const cards = [
    { label: "Пользователи", value: stats.usersCount, icon: Users },
    {
      label: "Поездки",
      value: stats.tripsCount,
      icon: Car,
      sub: `${stats.tripsByType.intercity} межгород · ${stats.tripsByType.city} по городу`,
    },
    {
      label: "Отзывы",
      value: stats.reviewsCount,
      icon: Star,
      sub: `${stats.reviewsByType.intercity} межгород · ${stats.reviewsByType.city} по городу`,
    },
    {
      label: "Новые жалобы",
      value: stats.newReportsCount,
      icon: Flag,
      alert: stats.newReportsCount > 0,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <div
            key={c.label}
            className={`bg-[#12121c] border rounded-2xl p-5 ${
              c.alert ? "border-yellow-500/30" : "border-white/5"
            }`}
          >
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-3">
              <c.icon size={16} className={c.alert ? "text-yellow-400" : ""} />
              {c.label}
            </div>

            <div className={`text-3xl font-bold ${c.alert ? "text-yellow-300" : ""}`}>
              {c.value}
            </div>

            {c.sub && <div className="text-xs text-gray-500 mt-1.5">{c.sub}</div>}
          </div>
        ))}
      </div>

      <div className="bg-[#12121c] border border-white/5 rounded-2xl p-5">
        <div className="flex items-center gap-2 text-gray-500 text-sm mb-4">
          <Eye size={16} />
          Посещения сайта
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {VISIT_PERIOD_LABELS.map(([key, label]) => {
            const period = stats.visits[key];
            const total = period.registered + period.guest;

            return (
              <div key={key} className="bg-[#171726] rounded-xl p-4">
                <div className="text-xs text-gray-500 mb-2">{label}</div>
                <div className="text-2xl font-bold">{total}</div>
                <div className="text-xs text-gray-500 mt-1.5">
                  {period.registered} зарегистрированных · {period.guest} гостей
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-[#12121c] border border-white/5 rounded-2xl p-5">
        <div className="flex items-center gap-2 text-gray-500 text-sm mb-4">
          <Shield size={16} />
          Администраторы
        </div>

        <div className="space-y-2">
          {stats.admins.map((admin) => (
            <div
              key={admin.id}
              className="flex items-center justify-between gap-3 bg-[#171726] rounded-xl px-4 py-3 text-sm"
            >
              <div className="font-medium">{admin.name}</div>

              <div className="text-gray-500 text-xs text-right">
                {admin.lastLoginIp ? (
                  <>
                    <span className="font-mono">{admin.lastLoginIp}</span>
                    {" · "}
                    {formatTimeAgo(admin.lastLoginAt)}
                  </>
                ) : (
                  "ещё не заходил"
                )}
              </div>
            </div>
          ))}

          {stats.admins.length === 0 && (
            <div className="text-sm text-gray-500 text-center py-4">
              Нет администраторов
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
