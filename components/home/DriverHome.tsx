"use client";

import { useState } from "react";
import { Bus, Car } from "lucide-react";

import DriverOrdersFeed from "@/components/taxi/DriverOrdersFeed";
import RoleSwitch from "./RoleSwitch";
import DriverTripsPanel from "./DriverTripsPanel";

type Tab = "taxi" | "intercity";

export default function DriverHome() {
  const [tab, setTab] = useState<Tab>("taxi");

  return (
    <div>
      <RoleSwitch />

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
      </div>

      {tab === "taxi" ? <DriverOrdersFeed /> : <DriverTripsPanel />}
    </div>
  );
}
