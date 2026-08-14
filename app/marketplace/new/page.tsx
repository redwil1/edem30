"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { useAuth } from "@/components/auth/AuthProvider";
import ListingForm from "@/components/marketplace/ListingForm";

export default function NewListingPage() {
  const { user, loading } = useAuth();

  if (loading) return null;

  if (!user) {
    return (
      <main className="min-h-screen bg-[#0b0b13] text-white flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center px-5">
          <div className="text-center">
            <p className="text-gray-400 mb-5">Войдите, чтобы разместить объявление.</p>
            <Link
              href="/login?redirect=/marketplace/new"
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

      <div className="max-w-md w-full mx-auto px-5 py-8 flex-1">
        <Link
          href="/marketplace"
          className="inline-flex items-center gap-2 text-sm text-gray-300 hover:text-white transition border border-white/10 rounded-xl px-4 py-2.5 mb-6"
        >
          <ArrowLeft size={15} />
          Назад
        </Link>

        <h1 className="text-2xl font-bold mb-6">Новое объявление</h1>

        <ListingForm mode="create" />
      </div>

      <Footer />
    </main>
  );
}
