"use client";

import { useState } from "react";
import CityModal from "./CityModal";
import DateModal from "./DateModal";
import LoadingScreen from "./LoadingScreen";
import { intercityDestinations } from "@/lib/cities";

export default function SearchCard() {
  const [mode, setMode] = useState<"intercity" | "taxi">("intercity");

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [date, setDate] = useState("");

  const [cityType, setCityType] = useState<"from" | "to">("from");

  const [cityOpen, setCityOpen] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);

  const [loading, setLoading] = useState(false);

  function searchTrips() {
    if (!from || !to || !date) {
      alert("Заполните все поля");
      return;
    }

    setLoading(true);

    setTimeout(() => {
      setLoading(false);

      alert(`Поиск поездок:\n\n${from} → ${to}\n${date}`);
    }, 900);
  }

  return (
    <>
      <div className="bg-[#151521] border border-violet-500/20 rounded-3xl p-6 shadow-2xl">
        <div className="flex bg-[#202030] rounded-2xl p-1 mb-6">
          <button
            onClick={() => setMode("intercity")}
            className={`flex-1 py-3 rounded-xl transition ${
              mode === "intercity" ? "bg-violet-600" : "text-gray-400"
            }`}
          >
            🚐 Межгород
          </button>

          <button
            onClick={() => setMode("taxi")}
            className={`flex-1 py-3 rounded-xl transition ${
              mode === "taxi" ? "bg-violet-600" : "text-gray-400"
            }`}
          >
            🚖 Такси
          </button>
        </div>

        <button
          onClick={() => {
            setCityType("from");
            setCityOpen(true);
          }}
          className="w-full bg-[#222233] rounded-xl p-4 mb-4 text-left hover:bg-[#2a2a40]"
        >
          {from || "📍 Откуда"}
        </button>

        <button
          onClick={() => {
            setCityType("to");
            setCityOpen(true);
          }}
          className="w-full bg-[#222233] rounded-xl p-4 mb-4 text-left hover:bg-[#2a2a40]"
        >
          {to || "🏙 Куда"}
        </button>

        <button
          onClick={() => setDateOpen(true)}
          className="w-full bg-[#222233] rounded-xl p-4 mb-6 text-left hover:bg-[#2a2a40]"
        >
          {date || "📅 Когда"}
        </button>

        <button
          onClick={searchTrips}
          className="w-full bg-violet-600 hover:bg-violet-700 rounded-xl py-4 text-lg font-bold transition"
        >
          Поехали →
        </button>

        <div className="mt-8">
          <h3 className="text-sm text-gray-400 mb-3">Популярные направления</h3>

          <div className="space-y-2">
            {[
              "Харабали → Астрахань",
              "Астрахань → Харабали",
              "Ахтубинск → Астрахань",
            ].map((route) => (
              <button
                key={route}
                className="w-full bg-[#202030] rounded-xl p-3 text-left hover:bg-violet-600 transition"
              >
                🚐 {route}
              </button>
            ))}
          </div>
        </div>
      </div>

      <CityModal
        cities={intercityDestinations}
        open={cityOpen}
        onClose={() => setCityOpen(false)}
        onSelect={(city) => {
          if (cityType === "from") {
            setFrom(city);
          } else {
            setTo(city);
          }
        }}
      />

      <DateModal
        open={dateOpen}
        onClose={() => setDateOpen(false)}
        onSelect={(value) => setDate(value)}
      />

      <LoadingScreen open={loading} />
    </>
  );
}
