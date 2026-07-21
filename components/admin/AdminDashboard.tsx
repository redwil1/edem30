"use client";

import { useEffect, useState } from "react";
import { Loader2, Users, Car, Star } from "lucide-react";

type Stats = {
  usersCount: number;
  tripsCount: number;
  reviewsCount: number;
};

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetch("/api/admin/stats", { cache: "no-store" })
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

  const cards = [
    { label: "Пользователи", value: stats.usersCount, icon: Users },
    { label: "Поездки", value: stats.tripsCount, icon: Car },
    { label: "Отзывы", value: stats.reviewsCount, icon: Star },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {cards.map((c) => (
        <div
          key={c.label}
          className="bg-[#12121c] border border-white/5 rounded-2xl p-5"
        >
          <div className="flex items-center gap-2 text-gray-500 text-sm mb-3">
            <c.icon size={16} />
            {c.label}
          </div>

          <div className="text-3xl font-bold">{c.value}</div>
        </div>
      ))}
    </div>
  );
}
