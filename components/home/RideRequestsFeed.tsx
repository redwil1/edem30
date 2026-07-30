"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Search } from "lucide-react";

import FormingTripCard, { FormingCluster } from "./FormingTripCard";

function fulfillHref(cluster: FormingCluster) {
  const params = new URLSearchParams({
    type: "intercity",
    from: cluster.from,
    to: cluster.to,
    date: cluster.date,
    time: cluster.time,
    totalSeats: String(Math.max(cluster.waitingCount, 1)),
    fulfillRequestIds: cluster.requestIds.join(","),
  });

  return `/create-trip?${params.toString()}`;
}

export default function RideRequestsFeed() {
  const [clusters, setClusters] = useState<FormingCluster[] | null>(null);

  async function load() {
    const res = await fetch("/api/ride-requests/forming", { cache: "no-store" });
    const data = await res.json().catch(() => null);
    setClusters(data?.clusters ?? []);
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 15_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-2 font-bold text-lg mb-5">
        <Search size={18} className="text-violet-400" />
        Формирующиеся поездки
      </div>

      {!clusters ? (
        <div className="py-16 flex items-center justify-center text-gray-500">
          <Loader2 size={20} className="animate-spin" />
        </div>
      ) : clusters.length === 0 ? (
        <div className="bg-[#12121c] border border-white/5 rounded-3xl p-10 text-center text-gray-500 text-sm">
          Пока никто не ищет водителя — загляните позже.
        </div>
      ) : (
        <div className="space-y-4">
          {clusters.map((cluster) => (
            <FormingTripCard
              key={`${cluster.from}-${cluster.to}-${cluster.date}-${cluster.time}`}
              cluster={cluster}
              action={
                <div className="flex items-center gap-2 flex-wrap">
                  {cluster.tripId !== null && (
                    <Link
                      href={`/trip/${cluster.tripId}`}
                      className="flex items-center justify-center gap-1.5 bg-[#1c1c2b] hover:bg-white/10 transition rounded-xl px-4 py-2.5 text-sm font-medium"
                    >
                      Подробнее
                    </Link>
                  )}

                  <Link
                    href={fulfillHref(cluster)}
                    className="flex items-center justify-center gap-1.5 flex-1 sm:flex-none bg-violet-600 hover:bg-violet-700 transition rounded-xl px-4 py-2.5 text-sm font-bold"
                  >
                    Я поеду
                  </Link>
                </div>
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
