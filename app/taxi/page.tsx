import Link from "next/link";
import { Car } from "lucide-react";

import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import TaxiDashboard from "@/components/taxi/TaxiDashboard";
import { listTrips } from "@/lib/trips";

export default function TaxiPage() {
  const scheduledTrips = listTrips("city");

  return (
    <main className="min-h-screen bg-[#0b0b13] text-white flex flex-col">
      <Navbar />

      <div className="max-w-[1400px] w-full mx-auto px-5 sm:px-6 lg:px-10 py-8 lg:py-10 flex-1">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 font-bold text-2xl sm:text-3xl">
              <Car size={26} className="text-violet-400 shrink-0" />
              Такси по городу
            </div>

            <p className="text-gray-400 mt-2 text-sm sm:text-base max-w-lg">
              Пассажир называет цену — свободные водители видят заказ в
              реальном времени и принимают его.
            </p>
          </div>

          <Link
            href="/create-trip"
            className="text-sm text-violet-400 hover:text-violet-300 transition whitespace-nowrap"
          >
            Разместить поездку по расписанию →
          </Link>
        </div>

        <TaxiDashboard scheduledTrips={scheduledTrips} />
      </div>

      <Footer />
    </main>
  );
}
