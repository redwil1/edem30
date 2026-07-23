"use client";

import Link from "next/link";
import { Loader2, ShieldCheck } from "lucide-react";

import { useAuth } from "@/components/auth/AuthProvider";
import { Trip } from "@/types/trips";
import LiveStats from "@/components/LiveStats";
import DriverHome from "./DriverHome";
import Hero from "./Hero";
import SchedulePanel from "./SchedulePanel";
import TaxiOrderCard from "./TaxiOrderCard";
import PopularDirectionsCard from "./PopularDirectionsCard";
import WhyUs from "./WhyUs";
import WelcomeGate from "./WelcomeGate";

type Props = {
  trips: Trip[];
};

export default function HomeContent({ trips }: Props) {
  const { user, loading, city, setCity } = useAuth();

  const visibleTrips = city
    ? trips.filter((trip) => trip.from === city || trip.to === city)
    : trips;

  if (loading) {
    return (
      <div className="py-32 flex items-center justify-center text-gray-500">
        <Loader2 size={20} className="animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <WelcomeGate trips={visibleTrips} city={city} onCityChange={setCity} />;
  }

  if (user.role === "driver") {
    return (
      <div className="max-w-[1400px] mx-auto px-5 sm:px-6 lg:px-10 py-8 lg:py-10">
        <DriverHome />
      </div>
    );
  }

  if (user.role === "admin") {
    return (
      <div className="max-w-[1400px] mx-auto px-5 sm:px-6 lg:px-10 py-16 flex flex-col items-center text-center">
        <ShieldCheck size={40} className="text-violet-400 mb-4" />

        <h1 className="text-2xl font-bold mb-2">Вы вошли как администратор</h1>

        <p className="text-gray-400 mb-6 max-w-md">
          Обычный пассажирский интерфейс для этого аккаунта скрыт. Управление
          сайтом — в админ-панели.
        </p>

        <Link
          href="/eadmin30"
          className="inline-block bg-violet-600 hover:bg-violet-700 transition rounded-xl px-6 py-3 font-bold"
        >
          Открыть админ-панель
        </Link>
      </div>
    );
  }

  return (
    <>
      <Hero city={city} onCityChange={setCity} />

      <div className="max-w-[1400px] mx-auto px-5 sm:px-6 lg:px-10">
        <LiveStats />
      </div>

      <div className="max-w-[1400px] mx-auto px-5 sm:px-6 lg:px-10 grid grid-cols-1 lg:grid-cols-3 gap-6 pb-10">
        <div className="lg:col-span-2">
          <SchedulePanel trips={trips} />
        </div>

        <div className="flex flex-col gap-6">
          <TaxiOrderCard />
          <PopularDirectionsCard />
        </div>
      </div>

      <WhyUs />
    </>
  );
}
