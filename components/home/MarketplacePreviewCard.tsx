"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

import ListingPrice from "@/components/marketplace/ListingPrice";
import type { ListingSummary } from "@/lib/marketplace";

export default function MarketplacePreviewCard() {
  const [listings, setListings] = useState<ListingSummary[] | null>(null);

  useEffect(() => {
    fetch("/api/marketplace/listings?sort=newest&limit=6", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => setListings(data.listings ?? []));
  }, []);

  // Ничего не рендерим, пока не знаем, есть ли объявления — и не рендерим
  // пустой блок, если их нет вообще.
  if (!listings || listings.length === 0) return null;

  return (
    <div className="bg-[#12121c] border border-white/5 rounded-3xl p-4 sm:p-6">
      <div className="font-display font-bold text-lg mb-1">🛍️ Барахолка</div>
      <div className="text-sm text-gray-500 mb-4">Купи, продай или отдай рядом</div>

      <div className="flex gap-3 overflow-x-auto pb-1">
        {listings.map((l) => (
          <Link
            key={l.id}
            href={`/marketplace/${l.id}`}
            className="w-[118px] shrink-0 bg-[#171726] border border-white/5 hover:border-violet-500/40 rounded-2xl overflow-hidden transition"
          >
            <div className="h-[72px] bg-[#1c1c2b] flex items-center justify-center text-2xl">
              {l.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={l.photoUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                "📦"
              )}
            </div>
            <div className="p-2.5">
              <div className="text-[11px] font-bold truncate">{l.title}</div>
              <div className="mt-0.5">
                <ListingPrice price={l.price} priceType={l.priceType} className="text-xs" />
              </div>
            </div>
          </Link>
        ))}
      </div>

      <Link
        href="/marketplace"
        className="flex items-center gap-1 text-sm text-violet-400 hover:text-violet-300 transition mt-4"
      >
        Все объявления
        <ChevronRight size={14} />
      </Link>
    </div>
  );
}
