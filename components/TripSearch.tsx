"use client";

import { useState } from "react";
import { ChevronDown, MapPin, X } from "lucide-react";

import CityModal from "./CityModal";
import TripsList from "./TripsList";
import { useTripSearch } from "@/hooks/useTripSearch";
import { Trip } from "@/types/trips";

type CityField = "from" | "to" | null;

type Props = {
  trips: Trip[];
  emptyText?: string;
};

export default function TripSearch({ trips, emptyText }: Props) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [cityModalField, setCityModalField] = useState<CityField>(null);

  const filteredTrips = useTripSearch(trips, from, to);

  return (
    <>
      <div className="bg-[#171726] rounded-3xl p-5 border border-violet-500/20">
        <div className="flex items-center gap-2 bg-[#222233] rounded-xl p-4 mb-4">
          <button
            type="button"
            onClick={() => setCityModalField("from")}
            className="flex-1 flex items-center gap-2 text-left min-w-0"
          >
            <MapPin size={18} className="text-gray-500 shrink-0" />
            <span className={`flex-1 min-w-0 truncate ${from ? "" : "text-gray-500"}`}>
              {from || "Откуда"}
            </span>
            <ChevronDown size={18} className="text-gray-500 shrink-0" />
          </button>

          {from && (
            <button
              type="button"
              onClick={() => setFrom("")}
              aria-label="Очистить"
              className="text-gray-500 hover:text-white transition shrink-0 p-1"
            >
              <X size={16} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 bg-[#222233] rounded-xl p-4 mb-5">
          <button
            type="button"
            onClick={() => setCityModalField("to")}
            className="flex-1 flex items-center gap-2 text-left min-w-0"
          >
            <MapPin size={18} className="text-gray-500 shrink-0" />
            <span className={`flex-1 min-w-0 truncate ${to ? "" : "text-gray-500"}`}>
              {to || "Куда"}
            </span>
            <ChevronDown size={18} className="text-gray-500 shrink-0" />
          </button>

          {to && (
            <button
              type="button"
              onClick={() => setTo("")}
              aria-label="Очистить"
              className="text-gray-500 hover:text-white transition shrink-0 p-1"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      <CityModal
        open={cityModalField !== null}
        onClose={() => setCityModalField(null)}
        onSelect={(city) => {
          if (cityModalField === "from") setFrom(city);
          if (cityModalField === "to") setTo(city);
        }}
        title={cityModalField === "from" ? "Откуда вы едете?" : "Куда вы едете?"}
      />

      <div className="mt-8">
        <TripsList trips={filteredTrips} emptyText={emptyText} />
      </div>
    </>
  );
}
