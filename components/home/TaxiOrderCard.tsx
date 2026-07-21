"use client";

import { useState } from "react";
import { Car, Circle, MapPin, Plus } from "lucide-react";

import AddressInput from "@/components/taxi/AddressInput";

export default function TaxiOrderCard() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [stops, setStops] = useState<string[]>([]);

  function findTaxi() {
    if (!from || !to) {
      alert("Укажите адрес отправления и назначения");
      return;
    }

    alert(`Ищем такси:\n${from} → ${to}`);
  }

  return (
    <div id="taxi" className="bg-[#12121c] border border-white/5 rounded-3xl p-4 sm:p-6 scroll-mt-24">
      <div className="flex items-center gap-2 font-bold text-lg mb-5">
        <Car size={18} className="text-violet-400" />
        Заказ такси
      </div>

      <div className="space-y-3">
        <div className="flex gap-3 items-center bg-[#1c1c2b] rounded-xl px-4 py-3">
          <Circle size={9} className="text-violet-400 fill-violet-400 shrink-0" />

          <div className="flex-1">
            <div className="text-xs text-gray-500">Откуда</div>

            <AddressInput
              value={from}
              onChange={setFrom}
              placeholder="Укажите адрес"
              inputClassName="w-full bg-transparent outline-none text-sm placeholder:text-gray-500 mt-0.5"
            />
          </div>
        </div>

        <div className="flex gap-3 items-center bg-[#1c1c2b] rounded-xl px-4 py-3">
          <MapPin size={14} className="text-red-400 shrink-0" />

          <div className="flex-1">
            <div className="text-xs text-gray-500">Куда</div>

            <AddressInput
              value={to}
              onChange={setTo}
              placeholder="Укажите адрес"
              inputClassName="w-full bg-transparent outline-none text-sm placeholder:text-gray-500 mt-0.5"
            />
          </div>
        </div>

        {stops.map((stop, i) => (
          <div
            key={i}
            className="flex gap-3 items-center bg-[#1c1c2b] rounded-xl px-4 py-3"
          >
            <Circle size={9} className="text-gray-500 shrink-0" />

            <input
              value={stop}
              onChange={(e) => {
                const next = [...stops];
                next[i] = e.target.value;
                setStops(next);
              }}
              placeholder="Остановка"
              className="w-full bg-transparent outline-none text-sm placeholder:text-gray-500"
            />
          </div>
        ))}

        <button
          onClick={() => setStops([...stops, ""])}
          className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-violet-400 transition px-1"
        >
          <Plus size={14} />
          Добавить остановку
        </button>
      </div>

      <button
        onClick={findTaxi}
        className="w-full mt-5 bg-violet-600 hover:bg-violet-700 transition rounded-xl py-3.5 font-bold"
      >
        Найти такси
      </button>
    </div>
  );
}
