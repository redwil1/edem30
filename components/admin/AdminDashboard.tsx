"use client";

import { useEffect, useState } from "react";
import { Loader2, Users, Car, Star, Flag } from "lucide-react";

type Stats = {
  usersCount: number;
  tripsCount: number;
  reviewsCount: number;
  newReportsCount: number;
};

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
    { label: "Поездки", value: stats.tripsCount, icon: Car },
    { label: "Отзывы", value: stats.reviewsCount, icon: Star },
    {
      label: "Новые жалобы",
      value: stats.newReportsCount,
      icon: Flag,
      alert: stats.newReportsCount > 0,
    },
  ];

  return (
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
        </div>
      ))}
    </div>
  );
}
