"use client";

import { useState } from "react";
import { Bus, Car, Search } from "lucide-react";

import DriverOrdersFeed from "@/components/taxi/DriverOrdersFeed";
import RoleSwitch from "./RoleSwitch";
import DriverTripsPanel from "./DriverTripsPanel";
import NotificationsCard from "./NotificationsCard";
import RideRequestsFeed from "./RideRequestsFeed";
import CarrierDashboardLink from "@/components/carrier/CarrierDashboardLink";

type Tab = "taxi" | "intercity" | "passengers";

export default function DriverHome() {
  const [tab, setTab] = useState<Tab>("taxi");

  return (
    <div>
      <RoleSwitch />

      <div className="max-w-md">
        <CarrierDashboardLink />
      </div>

      <div className="mb-6 max-w-md">
        <NotificationsCard />
      </div>

      <div className="flex bg-[#12121c] border border-white/5 rounded-2xl p-1 mb-6 max-w-md">
        <button
          type="button"
          onClick={() => setTab("taxi")}
          className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-medium transition ${
            tab === "taxi"
              ? "bg-violet-600 text-white"
              : "text-gray-400 hover:text-white"
          }`}
        >
          <Car size={15} />
          Такси
        </button>

        <button
          type="button"
          onClick={() => setTab("intercity")}
          className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-medium transition ${
            tab === "intercity"
              ? "bg-violet-600 text-white"
              : "text-gray-400 hover:text-white"
          }`}
        >
          <Bus size={15} />
          Межгород
        </button>

        <button
          type="button"
          onClick={() => setTab("passengers")}
          className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-medium transition ${
            tab === "passengers"
              ? "bg-violet-600 text-white"
              : "text-gray-400 hover:text-white"
          }`}
        >
          <Search size={15} />
          Пассажиры
        </button>
      </div>

      {tab === "taxi" && <DriverOrdersFeed />}
      {tab === "intercity" && <DriverTripsPanel />}
      {tab === "passengers" && <RideRequestsFeed />}
    </div>
  );
}
