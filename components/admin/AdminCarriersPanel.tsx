"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bus, Crown, Eye, Loader2, MessageSquare, Truck } from "lucide-react";

type CarrierOverview = {
  carriersCount: number;
  vipCount: number;
  activeRidesToday: number;
  totalViews: number;
  totalRequests: number;
  carriers: {
    id: number;
    slug: string;
    name: string;
    active: boolean;
    vehiclesCount: number;
    ridesToday: number;
    viewsTotal: number;
    requestsTotal: number;
    operator: { id: number; name: string } | null;
  }[];
};

export default function AdminCarriersPanel() {
  const [data, setData] = useState<CarrierOverview | null>(null);

  useEffect(() => {
    fetch("/api/admin/carriers", { cache: "no-store" })
      .then((res) => res.json())
      .then(setData);
  }, []);

  if (!data) {
    return (
      <div className="py-16 flex items-center justify-center text-gray-500">
        <Loader2 size={20} className="animate-spin" />
      </div>
    );
  }

  const cards = [
    { label: "Перевозчики", value: data.carriersCount, icon: Truck },
    { label: "VIP", value: data.vipCount, icon: Crown },
    { label: "Активных рейсов сегодня", value: data.activeRidesToday, icon: Bus },
    { label: "Всего просмотров", value: data.totalViews, icon: Eye },
    { label: "Заявок пассажиров", value: data.totalRequests, icon: MessageSquare },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {cards.map((c) => (
          <div key={c.label} className="bg-[#12121c] border border-white/5 rounded-2xl p-4">
            <div className="flex items-center gap-1.5 text-gray-500 text-xs mb-2">
              <c.icon size={13} />
              {c.label}
            </div>
            <div className="text-xl font-bold">{c.value}</div>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        {data.carriers.map((c) => (
          <div key={c.id} className="bg-[#12121c] border border-amber-500/20 rounded-3xl p-5">
            <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-400 bg-amber-500/15 rounded-full px-2.5 py-1">
                  <Crown size={11} />
                  VIP-партнёр
                </span>
                <span className="font-bold">{c.name}</span>
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    c.active ? "bg-green-500/15 text-green-400" : "bg-gray-500/15 text-gray-400"
                  }`}
                >
                  {c.active ? "Активен" : "Отключён"}
                </span>
              </div>

              <Link
                href={`/carrier/${c.slug}`}
                target="_blank"
                className="text-violet-400 text-sm font-medium hover:text-violet-300"
              >
                Открыть страницу →
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <div>
                <div className="text-gray-500 text-xs">Машин</div>
                <div className="font-bold">{c.vehiclesCount}</div>
              </div>
              <div>
                <div className="text-gray-500 text-xs">Рейсов сегодня</div>
                <div className="font-bold">{c.ridesToday}</div>
              </div>
              <div>
                <div className="text-gray-500 text-xs">Просмотров</div>
                <div className="font-bold">{c.viewsTotal}</div>
              </div>
              <div>
                <div className="text-gray-500 text-xs">Заявок</div>
                <div className="font-bold">{c.requestsTotal}</div>
              </div>
            </div>

            <div className="text-xs text-gray-500 mt-3">
              Оператор: {c.operator ? c.operator.name : "не привязан — назначьте во вкладке «Пользователи»"}
            </div>
          </div>
        ))}

        {data.carriers.length === 0 && (
          <div className="text-center text-gray-500 py-10">Перевозчиков ещё нет</div>
        )}
      </div>
    </div>
  );
}
