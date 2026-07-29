"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Flame } from "lucide-react";

import { FormingCluster } from "./FormingTripCard";

export default function FormingTripsLiveFeed() {
  const [clusters, setClusters] = useState<FormingCluster[] | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const res = await fetch("/api/ride-requests/forming", { cache: "no-store" });
      const data = await res.json().catch(() => null);
      if (!cancelled) setClusters(data?.clusters ?? []);
    }

    load();
    const interval = setInterval(load, 20_000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  if (!clusters || clusters.length === 0) return null;

  const top = clusters.slice(0, 4);

  return (
    <div className="bg-[#12121c] border border-orange-500/20 rounded-3xl p-4 sm:p-6">
      <div className="flex items-center gap-2 font-display font-bold mb-4">
        <Flame size={16} className="text-orange-400" />
        Сейчас формируются поездки
      </div>

      <div className="space-y-1">
        {top.map((c) => (
          <Link
            key={`${c.from}-${c.to}-${c.date}-${c.time}`}
            href="/find-driver"
            className="flex items-center justify-between gap-3 py-2.5 border-b border-white/5 last:border-0 hover:bg-white/[0.02] -mx-2 px-2 rounded-xl transition"
          >
            <div className="min-w-0">
              <div className="text-sm text-gray-200 truncate">
                {c.from} → {c.to}
              </div>
              <div className="text-xs text-gray-500 mt-0.5">
                {"👤".repeat(Math.min(c.waitingCount, 5))} Ждут {c.waitingCount}{" "}
                {c.waitingCount === 1 ? "пассажира" : "пассажиров"}
              </div>
            </div>

            <span className="shrink-0 text-xs text-violet-400 whitespace-nowrap">
              Нужен водитель
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
