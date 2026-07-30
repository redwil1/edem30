"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Flame } from "lucide-react";

import { formatDate } from "@/lib/utils";
import Avatar from "@/components/trip/Avatar";

type FormingPassenger = {
  id: number;
  name: string;
  avatarUrl: string | null;
  avatarPreset: string | null;
  count: number;
  comment: string | null;
};

type FormingCluster = {
  from: string;
  to: string;
  date: string;
  time: string;
  waitingCount: number;
  tripId: number | null;
  requestIds: number[];
  passengers: FormingPassenger[];
};

function passengerWord(count: number) {
  const mod10 = count % 10;
  const mod100 = count % 100;

  if (mod10 === 1 && mod100 !== 11) return "пассажир";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return "пассажира";
  return "пассажиров";
}

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

      <div>
        {top.map((c) => {
          const first = c.passengers[0];
          const extraCount = c.passengers.length - 1;

          return (
            <Link
              key={`${c.from}-${c.to}-${c.date}-${c.time}`}
              href={c.tripId !== null ? `/trip/${c.tripId}` : "/find-driver"}
              className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 py-4 sm:py-5 border-b border-white/5 last:border-0 hover:bg-white/[0.02] -mx-2 px-2 rounded-xl transition"
            >
              <div className="min-w-0 flex-1">
                {first && (
                  <div className="flex items-center gap-2 mb-2.5">
                    <Avatar
                      name={first.name}
                      size={26}
                      avatarUrl={first.avatarUrl}
                      avatarPreset={first.avatarPreset}
                    />
                    <span className="text-sm font-medium text-gray-200 truncate">
                      {first.name}
                      {extraCount > 0 && (
                        <span className="text-gray-500 font-normal"> + ещё {extraCount}</span>
                      )}
                    </span>
                  </div>
                )}

                <div className="font-bold text-xl leading-snug truncate">
                  {c.from} → {c.to}
                </div>

                <div className="text-sm mt-1.5 leading-none">
                  <span className="font-display font-bold">{c.time}</span>{" "}
                  <span className="text-violet-400">{formatDate(c.date)}</span>
                </div>

                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-full whitespace-nowrap bg-orange-500/15 text-orange-400 border border-orange-500/20">
                    <Flame size={11} />
                    {c.waitingCount} {passengerWord(c.waitingCount)}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between sm:flex-col sm:items-end gap-3 sm:gap-2.5 shrink-0">
                <span className="bg-violet-600/15 text-violet-300 text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap leading-none">
                  Ищет водителя
                </span>

                <span className="text-sm font-bold text-violet-400 whitespace-nowrap">
                  Открыть поездку
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
