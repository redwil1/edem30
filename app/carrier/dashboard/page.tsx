import type { Metadata } from "next";
import { redirect } from "next/navigation";

import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import CarrierDashboard from "@/components/carrier/CarrierDashboard";
import { getCarrierForAdminView, requireCarrierOperator } from "@/lib/carriers";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

type Props = {
  searchParams: Promise<{ carrierId?: string }>;
};

export default async function CarrierDashboardPage({ searchParams }: Props) {
  const operator = await requireCarrierOperator();

  // У водителя отдельный простой мобильный кабинет — CRM менеджера ему не нужна.
  if (operator && operator.role === "driver") {
    redirect("/carrier/driver");
  }

  const { carrierId: carrierIdParam } = await searchParams;

  const adminCarrier =
    !operator && carrierIdParam ? await getCarrierForAdminView(Number(carrierIdParam)) : null;

  const carrier = operator?.carrier ?? adminCarrier;

  if (!carrier) {
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
        <CarrierDashboard carrierName={carrier.name} carrierId={operator ? undefined : carrier.id} />
      </div>

      <Footer />
    </main>
  );
}
