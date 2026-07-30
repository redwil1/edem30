import type { Metadata } from "next";

import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import CarrierDashboard from "@/components/carrier/CarrierDashboard";
import { requireCarrierOperator } from "@/lib/carriers";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function CarrierDashboardPage() {
  const operator = await requireCarrierOperator();

  if (!operator) {
    return (
      <main className="min-h-screen bg-[#0b0b13] text-white flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center py-32 text-center px-5">
          <h1 className="text-2xl font-bold">Доступ запрещён</h1>
        </div>
        <Footer />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0b0b13] text-white flex flex-col">
      <Navbar />

      <div className="max-w-3xl w-full mx-auto px-5 py-8 flex-1">
        <CarrierDashboard carrierName={operator.carrier.name} />
      </div>

      <Footer />
    </main>
  );
}
