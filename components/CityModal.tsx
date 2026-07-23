"use client";

import { useEffect, useState } from "react";
import { Search, X } from "lucide-react";

import { cities } from "@/lib/cities";

type Props = {
  open: boolean;
  onClose: () => void;
  onSelect: (city: string) => void;
  title?: string;
};

export default function CityModal({ open, onClose, onSelect, title }: Props) {
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!open) return;

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }

    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const filtered = cities.filter((city) =>
    city.toLowerCase().includes(query.trim().toLowerCase())
  );

  return (
    <div
      className="fixed inset-0 h-[100dvh] bg-black/70 flex items-end sm:items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-[#171726] w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 max-h-[85dvh] sm:max-h-[80vh] flex flex-col min-h-0"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5 shrink-0">
          <h2 className="text-2xl font-bold">{title ?? "Выберите город"}</h2>

          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition p-1"
            aria-label="Закрыть"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex items-center gap-2 bg-[#222233] border border-white/10 focus-within:border-violet-500 rounded-xl px-4 py-3 mb-4 shrink-0 transition">
          <Search size={16} className="text-gray-500 shrink-0" />

          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Поиск населённого пункта"
            className="w-full bg-transparent outline-none text-sm placeholder:text-gray-500"
          />
        </div>

        <div className="space-y-2 overflow-y-auto flex-1 min-h-0">
          {filtered.map((city) => (
            <button
              key={city}
              onClick={() => {
                onSelect(city);
                onClose();
              }}
              className="w-full text-left p-4 rounded-xl bg-[#222233] hover:bg-violet-600 transition"
            >
              📍 {city}
            </button>
          ))}

          {filtered.length === 0 && (
            <div className="text-center text-gray-500 text-sm py-8">
              Ничего не найдено
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
