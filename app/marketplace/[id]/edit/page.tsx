import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import ListingForm from "@/components/marketplace/ListingForm";
import { getCurrentUser } from "@/lib/auth";
import { getListingById } from "@/lib/marketplace";

type Props = { params: Promise<{ id: string }> };

export default async function EditListingPage({ params }: Props) {
  const { id } = await params;
  const listingId = Number(id);

  const listing = await getListingById(listingId);
  if (!listing) notFound();

  const user = await getCurrentUser();
  if (!user) redirect(`/login?redirect=/marketplace/${listingId}/edit`);
  if (user.id !== listing.ownerId) redirect(`/marketplace/${listingId}`);

  return (
    <main className="min-h-screen bg-[#0b0b13] text-white flex flex-col">
      <Navbar />

      <div className="max-w-md w-full mx-auto px-5 py-8 flex-1">
        <Link
          href={`/marketplace/${listingId}`}
          className="inline-flex items-center gap-2 text-sm text-gray-300 hover:text-white transition border border-white/10 rounded-xl px-4 py-2.5 mb-6"
        >
          <ArrowLeft size={15} />
          Назад
        </Link>

        <h1 className="text-2xl font-bold mb-6">Редактировать объявление</h1>

        <ListingForm
          mode="edit"
          listingId={listingId}
          initial={{
            type: listing.type,
            category: listing.category,
            title: listing.title,
            description: listing.description,
            price: listing.price !== null ? String(listing.price) : "",
            priceType: listing.priceType,
            city: listing.city,
            condition: listing.condition ?? "",
            urgent: listing.urgent,
            exchangePossible: listing.exchangePossible,
            photoUrls: listing.photoUrls,
          }}
        />
      </div>

      <Footer />
    </main>
  );
}
