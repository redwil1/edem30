"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";

import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { useAuth } from "@/components/auth/AuthProvider";
import ListingCard from "@/components/marketplace/ListingCard";
import SavedSearchesPanel from "@/components/marketplace/SavedSearchesPanel";
import type { ListingSummary } from "@/lib/marketplace";

export default function SavedPage() {
  const { user, loading } = useAuth();
  const [favorites, setFavorites] = useState<ListingSummary[] | null>(null);

  useEffect(() => {
    if (!user) return;

    fetch("/api/marketplace/favorites", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => setFavorites(data.listings ?? []));
  }, [user]);

  if (loading) return null;

  if (!user) {
    return (
      <main className="min-h-screen bg-[#0b0b13] text-white flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center px-5">
          <div className="text-center">
            <p className="text-gray-400 mb-5">Войдите, чтобы увидеть избранное.</p>
            <Link
              href="/login?redirect=/marketplace/saved"
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

      <div className="max-w-2xl w-full mx-auto px-5 py-8 flex-1">
        <Link
          href="/marketplace"
          className="inline-flex items-center gap-2 text-sm text-gray-300 hover:text-white transition border border-white/10 rounded-xl px-4 py-2.5 mb-6"
        >
          <ArrowLeft size={15} />
          Барахолка
        </Link>

        <h1 className="text-2xl font-bold mb-6">Избранное</h1>

        {!favorites ? (
          <div className="py-10 flex items-center justify-center text-gray-500">
            <Loader2 size={20} className="animate-spin" />
          </div>
        ) : favorites.length === 0 ? (
          <div className="bg-[#12121c] border border-white/5 rounded-3xl p-8 text-center text-gray-500 text-sm mb-8">
            Пока ничего не добавлено в избранное
          </div>
        ) : (
          <div className="space-y-3 mb-8">
            {favorites.map((l) => (
              <ListingCard key={l.id} listing={l} />
            ))}
          </div>
        )}

        <h2 className="text-lg font-bold mb-4">Сохранённые поиски</h2>
        <SavedSearchesPanel />
      </div>

      <Footer />
    </main>
  );
}
