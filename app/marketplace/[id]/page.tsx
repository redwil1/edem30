import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ImageOff, ShieldCheck, Star } from "lucide-react";

import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import Avatar from "@/components/trip/Avatar";
import ListingBadges from "@/components/marketplace/ListingBadges";
import ListingPrice from "@/components/marketplace/ListingPrice";
import FavoriteButton from "@/components/marketplace/FavoriteButton";
import ContactButtons from "@/components/marketplace/ContactButtons";
import ListingOwnerControls from "@/components/marketplace/ListingOwnerControls";
import ReportListingButton from "@/components/marketplace/ReportListingButton";
import DealConfirmCard from "@/components/marketplace/DealConfirmCard";
import DeliveryHint from "@/components/marketplace/DeliveryHint";
import { getCurrentUser } from "@/lib/auth";
import { getListingById, getSellerStats, isFavorited } from "@/lib/marketplace";
import { categoryLabel } from "@/data/marketplaceCategories";
import { formatDate, formatRating } from "@/lib/utils";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const listing = await getListingById(Number(id));

  if (!listing) return { title: "Объявление не найдено" };

  return {
    title: listing.title,
    description: listing.description.slice(0, 160) || listing.title,
  };
}

export default async function ListingPage({ params }: Props) {
  const { id } = await params;
  const listingId = Number(id);

  const listing = await getListingById(listingId);

  if (!listing) notFound();

  const [user, sellerStats] = await Promise.all([
    getCurrentUser(),
    getSellerStats(listing.ownerId),
  ]);

  const favorited = user ? await isFavorited(user.id, listingId) : false;
  const isOwner = user?.id === listing.ownerId;

  const showDeliveryHint =
    !isOwner && user?.selectedCity && user.selectedCity !== listing.city;

  // Показываем всем залогиненным на sold-объявлении: владельцу и любому,
  // кто мог быть покупателем — реальное право подтвердить проверяется на
  // сервере (только тот, кто писал продавцу по этому объявлению).
  const showDealConfirm = listing.status === "sold" && !!user;

  return (
    <main className="min-h-screen bg-[#0b0b13] text-white flex flex-col">
      <Navbar />

      <div className="max-w-2xl w-full mx-auto px-5 py-8 flex-1">
        <Link
          href="/marketplace"
          className="inline-flex items-center gap-2 text-sm text-gray-300 hover:text-white transition border border-white/10 rounded-xl px-4 py-2.5 mb-6"
        >
          <ArrowLeft size={15} />
          Барахолка
        </Link>

        {listing.photoUrls.length > 0 ? (
          <div className="rounded-3xl overflow-hidden bg-[#12121c] border border-white/5 mb-5 aspect-[4/3] flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={listing.photoUrls[0]}
              alt={listing.title}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="rounded-3xl bg-[#12121c] border border-white/5 mb-5 aspect-[4/3] flex items-center justify-center">
            <ImageOff size={32} className="text-gray-700" />
          </div>
        )}

        {listing.photoUrls.length > 1 && (
          <div className="flex gap-2 mb-5 overflow-x-auto">
            {listing.photoUrls.map((url, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={i}
                src={url}
                alt=""
                className="w-16 h-16 rounded-xl object-cover border border-white/5 shrink-0"
              />
            ))}
          </div>
        )}

        <div className="mb-3">
          <ListingBadges
            type={listing.type}
            priceType={listing.priceType}
            urgent={listing.urgent}
            status={listing.status}
          />
        </div>

        <div className="flex items-start justify-between gap-3">
          <h1 className="text-xl sm:text-2xl font-bold leading-snug">{listing.title}</h1>

          {!isOwner && <FavoriteButton listingId={listing.id} initialFavorited={favorited} />}
        </div>

        <div className="flex items-baseline gap-3 mt-2 mb-5">
          <ListingPrice price={listing.price} priceType={listing.priceType} className="text-2xl" />
          <span className="text-sm text-gray-500">
            {listing.city} · {categoryLabel(listing.category)}
          </span>
        </div>

        {listing.description && (
          <p className="text-sm text-gray-300 leading-relaxed mb-6 whitespace-pre-wrap">
            {listing.description}
          </p>
        )}

        <div className="bg-[#12121c] border border-white/5 rounded-2xl p-4 mb-5">
          <Link
            href={`/profile/${listing.owner.id}`}
            className="flex items-center gap-3 hover:opacity-80 transition"
          >
            <Avatar
              name={listing.owner.name}
              size={44}
              avatarUrl={listing.owner.avatarUrl}
              avatarPreset={listing.owner.avatarPreset}
            />

            <div className="flex-1 min-w-0">
              <div className="font-bold text-sm">{listing.owner.name}</div>
              <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5 flex-wrap">
                {listing.owner.verified && (
                  <span className="flex items-center gap-1 text-green-400">
                    <ShieldCheck size={11} />
                    Телефон подтверждён
                  </span>
                )}
                {listing.owner.ratingCount > 0 ? (
                  <span className="flex items-center gap-1 text-yellow-400">
                    <Star size={11} className="fill-yellow-400" />
                    {formatRating(listing.owner.ratingAverage)} · {listing.owner.ratingCount} отзывов
                  </span>
                ) : (
                  <span>Пока нет отзывов</span>
                )}
                <span>· {sellerStats.completed} сделок</span>
              </div>
            </div>
          </Link>

          {!isOwner && (
            <div className="mt-4">
              <ContactButtons listingId={listing.id} />
            </div>
          )}
        </div>

        {showDeliveryHint && (
          <div className="mb-5">
            <DeliveryHint fromCity={listing.city} toCity={user!.selectedCity!} />
          </div>
        )}

        {isOwner && (
          <div className="mb-5">
            <ListingOwnerControls listingId={listing.id} status={listing.status} />
          </div>
        )}

        {showDealConfirm && (
          <div className="mb-5">
            <DealConfirmCard listingId={listing.id} />
          </div>
        )}

        <div className="text-xs text-gray-500 mb-4">
          Опубликовано {formatDate(listing.createdAt.slice(0, 10))}
        </div>

        {!isOwner && user && <ReportListingButton listingId={listing.id} />}
      </div>

      <Footer />
    </main>
  );
}
