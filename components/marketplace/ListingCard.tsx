import Link from "next/link";

import { formatDate } from "@/lib/utils";
import type { ListingSummary } from "@/lib/marketplace";
import { categoryLabel } from "@/data/marketplaceCategories";
import ListingBadges from "./ListingBadges";
import ListingPrice from "./ListingPrice";

export default function ListingCard({ listing }: { listing: ListingSummary }) {
  return (
    <Link
      href={`/marketplace/${listing.id}`}
      className="flex gap-3 bg-[#12121c] border border-white/5 hover:border-violet-500/40 rounded-2xl p-3 transition"
    >
      <div className="w-[68px] h-[68px] rounded-xl bg-[#1c1c2b] shrink-0 overflow-hidden flex items-center justify-center text-2xl">
        {listing.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={listing.photoUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          "📦"
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="font-bold text-sm truncate">{listing.title}</div>

        <div className="text-xs text-gray-500 mt-0.5">
          {listing.city} · {categoryLabel(listing.category)} · {formatDate(listing.createdAt.slice(0, 10))}
        </div>

        <div className="mt-1.5">
          <ListingPrice price={listing.price} priceType={listing.priceType} className="text-sm" />
        </div>

        <div className="mt-1.5">
          <ListingBadges
            type={listing.type}
            priceType={listing.priceType}
            urgent={listing.urgent}
            status={listing.status}
          />
        </div>
      </div>
    </Link>
  );
}
