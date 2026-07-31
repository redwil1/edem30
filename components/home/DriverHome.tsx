"use client";

import { useState } from "react";
import { Bus, Search } from "lucide-react";

import DriverOrdersFeed from "@/components/taxi/DriverOrdersFeed";
import RoleSwitch from "./RoleSwitch";
import DriverTripsPanel from "./DriverTripsPanel";
import NotificationsCard from "./NotificationsCard";
import RideRequestsFeed from "./RideRequestsFeed";
import CarrierDashboardLink from "@/components/carrier/CarrierDashboardLink";

type Tab = "taxi" | "intercity" | "passengers";

export default function DriverHome() {
  const [tab, setTab] = useState<Tab>("passengers");

  return (
    <div>
      <RoleSwitch />

      <div className="max-w-md">
        <CarrierDashboardLink />
      </div>

      <div className="mb-6 max-w-md">
        <NotificationsCard />
      </div>

      {/* Такси временно скрыто из вкладок водителя — DriverOrdersFeed ниже
          оставлен нерендерящимся, чтобы вернуть в один шаг. */}
      <div className="flex bg-[#12121c] border border-white/5 rounded-2xl p-1 mb-6 max-w-md">
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
      </div>

      {tab === "taxi" && <DriverOrdersFeed />}
      {tab === "intercity" && <DriverTripsPanel />}
      {tab === "passengers" && <RideRequestsFeed />}
    </div>
  );
}
