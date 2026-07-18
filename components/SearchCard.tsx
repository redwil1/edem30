"use client";

import { useState } from "react";

export default function SearchCard() {
  const [mode, setMode] = useState("intercity");

  return (
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

      <input
        placeholder="📍 Откуда"
        className="w-full mb-4 rounded-xl bg-[#222233] p-4 outline-none"
      />

      <input
        placeholder="🏙 Куда"
        className="w-full mb-4 rounded-xl bg-[#222233] p-4 outline-none"
      />

      <input
        placeholder="📅 Когда"
        className="w-full mb-6 rounded-xl bg-[#222233] p-4 outline-none"
      />

      <button className="w-full bg-violet-600 hover:bg-violet-700 transition rounded-xl py-4 text-lg font-semibold">
        Поехали →
      </button>

      <div className="mt-8">
        <h3 className="text-sm text-gray-400 mb-3">Популярные направления</h3>

        <div className="space-y-2">
          <div className="bg-[#202030] rounded-xl p-3">
            Харабали → Астрахань
          </div>

          <div className="bg-[#202030] rounded-xl p-3">
            Ахтубинск → Харабали
          </div>

          <div className="bg-[#202030] rounded-xl p-3">
            Астрахань → Харабали
          </div>
        </div>
      </div>
    </div>
  );
}
