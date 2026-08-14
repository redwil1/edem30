import type { Metadata } from "next";

import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import MarketplaceFeed from "@/components/marketplace/MarketplaceFeed";

export const metadata: Metadata = {
  title: "Барахолка",
  description:
    "Локальная доска объявлений Едем30 — купить, продать или отдать даром в Харабалях, Астрахани и области.",
  alternates: {
    canonical: "/marketplace",
  },
};

export default function MarketplacePage() {
  return (
    <main className="min-h-screen bg-[#0b0b13] text-white flex flex-col">
      <Navbar />

      <div className="max-w-5xl w-full mx-auto px-5 py-8 flex-1">
        <MarketplaceFeed />
      </div>

      <Footer />
    </main>
  );
}
