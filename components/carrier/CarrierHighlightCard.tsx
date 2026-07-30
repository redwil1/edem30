"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bus } from "lucide-react";

type Highlight = {
  slug: string;
  name: string;
  ride: {
    fromCity: string;
    toCity: string;
    rideDate: string;
    departureTime: string;
    price: number;
    freeSeats: number;
  } | null;
};

function dateLabel(dateStr: string) {
  const today = new Date().toISOString().slice(0, 10);
  const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);

  if (dateStr === today) return "Сегодня";
  if (dateStr === tomorrow) return "Завтра";

  return new Date(`${dateStr}T00:00:00`).toLocaleDateString("ru-RU", { day: "numeric", month: "long" });
}

/**
 * Блок регулярных рейсов VIP-перевозчиков. Ничего не выдумывает: если ни
 * у одного активного перевозчика нет ближайшего рейса — не рендерится.
 */
export default function CarrierHighlightCard({ from, to }: { from?: string; to?: string } = {}) {
  const [highlights, setHighlights] = useState<Highlight[] | null>(null);

  useEffect(() => {
    fetch("/api/carrier/highlights", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => setHighlights(data.highlights ?? []));
  }, []);

  if (!highlights) return null;

  const filtered = highlights.filter((h) => {
    if (!h.ride) return false;
    if (from && h.ride.fromCity !== from) return false;
    if (to && h.ride.toCity !== to) return false;
    return true;
  });

  if (filtered.length === 0) return null;

  return (
    <div className="space-y-3">
      {filtered.map((h) => (
        <div key={h.slug} className="bg-[#171726] border border-amber-500/20 rounded-3xl p-5">
          <div className="flex items-center gap-1.5 text-amber-400 text-xs font-bold mb-3">
            <Bus size={14} />
            Регулярные рейсы
          </div>

          <div className="font-bold mb-1">{h.name}</div>

          <div className="text-sm text-gray-400 mb-1">Ближайший рейс:</div>
          <div className="font-medium">
            {h.ride!.fromCity} → {h.ride!.toCity}
          </div>
          <div className="text-violet-400 font-semibold">
            {dateLabel(h.ride!.rideDate)} {h.ride!.departureTime}
          </div>

          <div className="flex items-center justify-between mt-3">
            <div className="text-sm text-gray-400">
              💺 Свободно {h.ride!.freeSeats} мест · 💰 {h.ride!.price} ₽
            </div>

            <Link href={`/carrier/${h.slug}`} className="text-violet-400 text-sm font-medium hover:text-violet-300">
              Все рейсы →
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
}
