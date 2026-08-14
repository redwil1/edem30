"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Plus } from "lucide-react";

import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { useAuth } from "@/components/auth/AuthProvider";
import ListingCard from "@/components/marketplace/ListingCard";
import type { ListingSummary } from "@/lib/marketplace";

export default function MyListingsPage() {
  const { user, loading } = useAuth();
  const [listings, setListings] = useState<ListingSummary[] | null>(null);

  useEffect(() => {
    if (!user) return;

    fetch("/api/marketplace/mine", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => setListings(data.listings ?? []));
  }, [user]);

  if (loading) return null;

  if (!user) {
    return (
      <main className="min-h-screen bg-[#0b0b13] text-white flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center px-5">
          <div className="text-center">
            <p className="text-gray-400 mb-5">Войдите, чтобы увидеть свои объявления.</p>
            <Link
              href="/login?redirect=/marketplace/mine"
              className="inline-block bg-violet-600 hover:bg-violet-700 transition rounded-xl px-6 py-3 font-bold"
            >
              Войти
            </Link>
          </div>
        </div>
        <Footer />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0b0b13] text-white flex flex-col">
      <Navbar />

      <div className="max-w-5xl w-full mx-auto px-5 py-8 flex-1">
        <Link
          href="/marketplace"
          className="inline-flex items-center gap-2 text-sm text-gray-300 hover:text-white transition border border-white/10 rounded-xl px-4 py-2.5 mb-6"
        >
          <ArrowLeft size={15} />
          Барахолка
        </Link>

        <div className="flex items-center justify-between gap-3 mb-6">
          <h1 className="text-2xl font-bold">Мои объявления</h1>
          <Link
            href="/marketplace/new"
            className="btn-gradient flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-bold whitespace-nowrap"
          >
            <Plus size={15} />
            Разместить
          </Link>
        </div>

        {!listings ? (
          <div className="py-16 flex items-center justify-center text-gray-500">
            <Loader2 size={20} className="animate-spin" />
          </div>
        ) : listings.length === 0 ? (
          <div className="bg-[#12121c] border border-white/5 rounded-3xl p-10 text-center text-gray-500 text-sm">
            У вас пока нет объявлений.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {listings.map((l) => (
              <ListingCard key={l.id} listing={l} />
            ))}
          </div>
        )}
      </div>

      <Footer />
    </main>
  );
}
