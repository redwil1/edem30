import type { Metadata } from "next";

import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import TripSearch from "@/components/TripSearch";
import { listTrips } from "@/lib/trips";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Межгородние поездки и попутчики",
  description:
    "Расписание поездок между Астраханью, Харабали и другими городами области. Найдите попутчиков или предложите свою поездку.",
};

export default async function SearchPage() {
  const trips = await listTrips("intercity");

  return (
    <main className="min-h-screen bg-[#0b0b13] text-white flex flex-col">
      <Navbar />

      <div className="max-w-md mx-auto px-5 py-8 flex-1 w-full">
        <h1 className="text-3xl font-bold mb-6">Поиск поездок</h1>

        <TripSearch trips={trips} emptyText="Межгородних поездок пока нет" />
      </div>

      <Footer />
    </main>
  );
}
