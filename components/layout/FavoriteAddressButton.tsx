"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Star } from "lucide-react";

type FavoriteAddress = {
  id: number;
  label: string;
  address: string;
};

type Props = {
  variant?: "desktop" | "mobile";
};

export default function FavoriteAddressButton({ variant = "desktop" }: Props) {
  const router = useRouter();
  const [favorites, setFavorites] = useState<FavoriteAddress[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetch("/api/favorite-addresses", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => setFavorites(data.addresses ?? []))
      .catch(() => {});
  }, []);

  if (favorites.length === 0) return null;

  function goTo(address: string) {
    setOpen(false);
    router.push(`/taxi?from=${encodeURIComponent(address)}`);
  }

  if (variant === "mobile") {
    return (
      <div className="mt-3 pt-3 border-t border-white/5">
        <div className="flex items-center gap-1.5 text-sm text-gray-400 mb-2.5">
          <Star size={14} className="text-violet-400" />
          Избранные адреса
        </div>

        <div className="flex flex-wrap gap-1.5">
          {favorites.map((f) => (
            <button
              key={f.id}
              onClick={() => goTo(f.address)}
              className="text-xs font-medium bg-[#171726] hover:bg-white/10 transition rounded-lg px-3 py-2"
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center justify-center w-10 h-10 rounded-xl border border-white/10 hover:bg-white/5 transition text-gray-300 hover:text-violet-400"
        aria-label="Избранные адреса"
        title="Избранные адреса"
      >
        <Star size={18} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />

          <div className="absolute right-0 top-full mt-2 w-64 bg-[#171726] border border-white/10 rounded-2xl p-1.5 z-40 shadow-xl">
            <div className="px-3 pt-2 pb-1.5 text-xs font-medium text-gray-500">
              Избранные адреса
            </div>

            {favorites.map((f) => (
              <button
                key={f.id}
                onClick={() => goTo(f.address)}
                className="w-full flex flex-col items-start gap-0.5 px-3 py-2.5 rounded-xl text-left hover:bg-white/5 transition"
              >
                <span className="text-sm font-medium flex items-center gap-1.5">
                  <Star size={12} className="text-violet-400 shrink-0" />
                  {f.label}
                </span>
                <span className="text-xs text-gray-500 truncate max-w-full">
                  {f.address}
                </span>
              </button>
            ))}

            <Link
              href="/profile"
              onClick={() => setOpen(false)}
              className="block px-3 py-2.5 rounded-xl text-xs text-violet-400 hover:bg-white/5 transition mt-1 border-t border-white/5 pt-2.5"
            >
              Управлять адресами →
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
