"use client";

import { useState } from "react";
import TripsList from "./TripsList";
import { useTripSearch } from "@/hooks/useTripSearch";
import { Trip } from "@/types/trips";

type Props = {
  trips: Trip[];
  emptyText?: string;
};

export default function TripSearch({ trips, emptyText }: Props) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const filteredTrips = useTripSearch(trips, from, to);

  return (
    <>
      <div className="bg-[#171726] rounded-3xl p-5 border border-violet-500/20">
        <input
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          placeholder="📍 Откуда"
          className="w-full bg-[#222233] rounded-xl p-4 mb-4 outline-none"
        />

        <input
          value={to}
          onChange={(e) => setTo(e.target.value)}
          placeholder="🏙 Куда"
          className="w-full bg-[#222233] rounded-xl p-4 mb-5 outline-none"
        />
      </div>

      <div className="mt-8">
        <TripsList trips={filteredTrips} emptyText={emptyText} />
      </div>
    </>
  );
}
