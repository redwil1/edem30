import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { popularDirections } from "@/data/popularDirections";
import { formatPrice } from "@/lib/utils";

export default function PopularDirectionsCard() {
  return (
    <div className="bg-[#12121c] border border-white/5 rounded-3xl p-4 sm:p-6">
      <div className="font-display font-bold text-lg mb-4">Популярные направления</div>

      <div className="space-y-1">
        {popularDirections.map((route) => (
          <div
            key={`${route.from}-${route.to}`}
            className="flex items-center justify-between py-2.5 border-b border-white/5 last:border-0"
          >
            <div className="text-sm text-gray-300">
              {route.from} → {route.to}
            </div>

            <div className="text-sm text-violet-400 font-medium whitespace-nowrap">
              от {formatPrice(route.price)}
            </div>
          </div>
        ))}
      </div>

      <Link
        href="/search"
        className="flex items-center gap-1 text-sm text-violet-400 hover:text-violet-300 transition mt-4"
      >
        Все направления
        <ChevronRight size={14} />
      </Link>
    </div>
  );
}
