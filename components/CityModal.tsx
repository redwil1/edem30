"use client";

import { cities } from "@/data/cities";

type Props = {
  open: boolean;
  onClose: () => void;
  onSelect: (city: string) => void;
};

export default function CityModal({ open, onClose, onSelect }: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-end justify-center z-50">
      <div className="bg-[#171726] w-full max-w-md rounded-t-3xl p-6">
        <h2 className="text-2xl font-bold mb-6">Выберите город</h2>

        <div className="space-y-2">
          {cities.map((city) => (
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
        </div>
      </div>
    </div>
  );
}
