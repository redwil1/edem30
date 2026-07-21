"use client";

import { Loader2 } from "lucide-react";

import { useAuth } from "@/components/auth/AuthProvider";
import DriverOrdersFeed from "@/components/taxi/DriverOrdersFeed";
import { Trip } from "@/types/trips";
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
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="py-32 flex items-center justify-center text-gray-500">
        <Loader2 size={20} className="animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <WelcomeGate trips={trips} />;
  }

  if (user.role === "driver") {
    return (
      <div className="max-w-[1400px] mx-auto px-5 sm:px-6 lg:px-10 py-8 lg:py-10">
        <DriverOrdersFeed />
      </div>
    );
  }

  return (
    <>
      <Hero />

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
