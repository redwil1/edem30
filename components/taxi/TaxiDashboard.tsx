"use client";

import Link from "next/link";
import { Loader2 } from "lucide-react";

import { useAuth } from "@/components/auth/AuthProvider";
import DriverOrdersFeed from "@/components/taxi/DriverOrdersFeed";
import PassengerTaxiOrder from "@/components/taxi/PassengerTaxiOrder";
import TripsList from "@/components/TripsList";
import { Trip } from "@/types/trips";

type Props = {
  scheduledTrips: Trip[];
  initialFrom?: string;
  initialTo?: string;
};

export default function TaxiDashboard({
  scheduledTrips,
  initialFrom,
  initialTo,
}: Props) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="py-16 flex items-center justify-center text-gray-500">
        <Loader2 size={20} className="animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="bg-[#12121c] border border-white/5 rounded-3xl p-8 text-center">
        <p className="text-gray-400 mb-5">
          Войдите, чтобы заказать такси или начать таксовать.
        </p>

        <Link
          href="/login?redirect=/taxi"
          className="inline-block bg-violet-600 hover:bg-violet-700 transition rounded-xl px-6 py-3 font-bold"
        >
          Войти
        </Link>
      </div>
    );
  }

  return user.role === "driver" ? (
    <DriverOrdersFeed />
  ) : (
    <div className="max-w-md space-y-10">
      <PassengerTaxiOrder initialFrom={initialFrom} initialTo={initialTo} />

      <TripsList
        trips={scheduledTrips}
        emptyText="Пока нет поездок по расписанию"
      />
    </div>
  );
}
