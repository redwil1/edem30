import type { Metadata } from "next";
import { redirect } from "next/navigation";

import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import DriverDashboard from "@/components/carrier/DriverDashboard";
import { requireCarrierOperator } from "@/lib/carriers";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function CarrierDriverPage() {
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

  // Менеджер/оператор попадают в полноценную CRM, а не в упрощённый кабинет водителя.
  if (operator.role !== "driver") {
    redirect("/carrier/dashboard");
  }

  return (
    <main className="min-h-screen bg-[#0b0b13] text-white flex flex-col">
      <Navbar />

      <div className="max-w-md w-full mx-auto px-5 py-8 flex-1">
        <DriverDashboard carrierName={operator.carrier.name} />
      </div>

      <Footer />
    </main>
  );
}
