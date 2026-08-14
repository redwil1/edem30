import Link from "next/link";
import { ImageOff } from "lucide-react";

import { formatDate } from "@/lib/utils";
import type { ListingSummary } from "@/lib/marketplace";
import ListingBadges from "./ListingBadges";
import ListingPrice from "./ListingPrice";
import FavoriteButton from "./FavoriteButton";

export default function ListingCard({ listing }: { listing: ListingSummary }) {
  return (
    <Link
      href={`/marketplace/${listing.id}`}
      className="block bg-[#12121c] border border-white/5 hover:border-violet-500/40 rounded-2xl overflow-hidden transition"
    >
      <div className="relative aspect-square bg-[#1c1c2b] flex items-center justify-center">
        {listing.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={listing.photoUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <ImageOff size={22} className="text-gray-700" />
        )}

        <div className="absolute top-2 right-2">
          <FavoriteButton listingId={listing.id} initialFavorited={listing.favorited} variant="overlay" />
        </div>

        {listing.urgent && (
          <span className="absolute top-2 left-2 text-[10px] font-bold px-2 py-1 rounded-full bg-amber-500 text-black">
            Срочно
          </span>
        )}

        {listing.status !== "active" && (
          <div className="absolute inset-0 bg-black/55 flex items-center justify-center">
            <ListingBadges
              type={listing.type}
              priceType={listing.priceType}
              urgent={false}
              status={listing.status}
            />
          </div>
        )}
      </div>

      <div className="p-2.5">
        <ListingPrice price={listing.price} priceType={listing.priceType} className="text-sm" />

        <div className="text-xs font-medium mt-1 leading-snug line-clamp-2 min-h-[2.2em]">
          {listing.title}
        </div>

        <div className="text-[11px] text-gray-500 mt-1.5">
          {listing.city} · {formatDate(listing.createdAt.slice(0, 10))}
        </div>
      </div>
    </Link>
  );
}
