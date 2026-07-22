"use client";

import { useEffect, useState } from "react";
import { Star } from "lucide-react";

type FavoriteAddress = {
  id: number;
  label: string;
  address: string;
};

type Props = {
  onSelect: (address: string) => void;
};

export default function FavoriteAddressChips({ onSelect }: Props) {
  const [favorites, setFavorites] = useState<FavoriteAddress[]>([]);

  useEffect(() => {
    fetch("/api/favorite-addresses", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => setFavorites(data.addresses ?? []))
      .catch(() => {});
  }, []);

  if (favorites.length === 0) return null;

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 -mt-1">
      {favorites.map((f) => (
        <button
          key={f.id}
          type="button"
          onClick={() => onSelect(f.address)}
          className="flex items-center gap-1 text-xs font-medium bg-[#1c1c2b] hover:bg-white/10 transition rounded-lg px-2.5 py-1.5 whitespace-nowrap shrink-0"
        >
          <Star size={11} className="text-violet-400 shrink-0" />
          {f.label}
        </button>
      ))}
    </div>
  );
}
